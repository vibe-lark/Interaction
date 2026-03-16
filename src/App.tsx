import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bridge } from '@lark-opdev/block-docs-addon-api';
import { arrayMove } from '@dnd-kit/sortable';
import { AvatarStack, UserAvatar } from './components/Avatar';
import { RankingViewer } from './components/ranking/RankingViewer';
import { LikeBurstButton } from './components/LikeBurstButton';
import { DocMiniApp, StoreService } from './services/store';
import { I18nProvider, useI18n } from './i18n';
import { getCurrentUserAvatar, getCurrentUserId, getCurrentUserName, setCachedUser } from './utils/user';
import './index.css';

declare global {
  interface Window {
    lark?: {
      store?: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<void>;
        global_get: (key: string) => Promise<any>;
        global_set: (key: string, value: string) => Promise<void>;
      };
      user?: {
        name: string;
        avatar_url: string;
        open_id: string;
        union_id: string;
      };
    };
    magic?: {
      store?: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<void>;
        global_get: (key: string) => Promise<any>;
        global_set: (key: string, value: string) => Promise<void>;
      };
      user?: {
        name: string;
        avatar_url: string;
        open_id: string;
        union_id: string;
      };
    };
  }
}

const UPLOAD_API = 'https://ife.bytedance.net/cdn/upload';
const UPLOAD_CONFIG = {
  dir: 'medical_dec_image/questionnaire',
  region: 'CN',
  email: 'tangent.1206@bytedance.com'
};

const patchBlockedMonitoringRequests = () => {
  try {
    const proto: any = XMLHttpRequest.prototype as any;
    if (proto.__interaction_xhr_patched__) return;
    const origOpen = proto.open;
    const origSend = proto.send;
    proto.open = function (method: string, url: string, ...rest: any[]) {
      const shouldBlock = typeof url === 'string' && url.includes('slardar-bd.feishu.cn/monitor_browser/collect/batch/');
      (this as any).__interaction_blocked__ = shouldBlock;
      if (shouldBlock) {
        return origOpen.call(this, method, 'about:blank', ...rest);
      }
      return origOpen.call(this, method, url, ...rest);
    };
    proto.send = function (...args: any[]) {
      if ((this as any).__interaction_blocked__) return;
      return origSend.apply(this, args);
    };
    proto.__interaction_xhr_patched__ = true;
  } catch (e) {}
};

patchBlockedMonitoringRequests();

interface Option {
  id: string;
  text: string;
  imageUrl: string;
}

interface WordCloudConfig {
  maxWords: number;
  minWordLength: number;
  fontFamily: string;
}

interface QAConfig {
  allowAnonymous: boolean;
  allowUpvote: boolean;
  showAuthor: boolean;
}

interface RankingConfig {
  mode: 'ranking' | 'scale';
  scaleMin: number;
  scaleMax: number;
  scaleLabels: Record<number, string>;
  items: { id: string; text: string }[];
}

interface Question {
  id: string;
  text: string;
  author: string | null;
  authorId?: string;
  authorAvatar?: string;
  upvotes: number;
  timestamp: number;
}

interface UserState {
  hasParticipated: boolean;
  votedOptions?: string[];
  submittedWords?: string[];
  upvotedQuestions?: string[];
  submittedQuestions?: string[];
  rankingAnswers?: any;
  tempScaleSelections?: Record<string, number>;
}

interface EditorDraft {
  type: 'live_polling' | 'word_cloud' | 'qa' | 'ranking';
  title: string;
  deadline: string;
  allowAnonymous: boolean;
  allowMultiple: boolean;
  minSelections: number;
  maxSelections: number;
  layout: 'list' | 'card';
  options: Option[];
  wordCloudConfig: WordCloudConfig;
  qaConfig: QAConfig;
  rankingConfig: RankingConfig;
}

const createInitialDraft = (t: (key: string, params?: Record<string, string | number>) => string): EditorDraft => ({
  type: 'live_polling',
  title: '',
  deadline: '',
  allowAnonymous: false,
  allowMultiple: false,
  minSelections: 1,
  maxSelections: 2,
  layout: 'list',
  options: [
    { id: 'opt_1', text: '', imageUrl: '' },
    { id: 'opt_2', text: '', imageUrl: '' }
  ],
  wordCloudConfig: {
    maxWords: 30,
    minWordLength: 1,
    fontFamily: 'system-ui'
  },
  qaConfig: {
    allowAnonymous: false,
    allowUpvote: true,
    showAuthor: true
  },
  rankingConfig: {
    mode: 'ranking',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      1: t('ranking.scale_label.1'),
      2: t('ranking.scale_label.2'),
      3: t('ranking.scale_label.3'),
      4: t('ranking.scale_label.4'),
      5: t('ranking.scale_label.5')
    },
    items: [
      { id: 'item_1', text: '' },
      { id: 'item_2', text: '' }
    ]
  }
});

const uploadToCDN = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file, file.name || 'unknown.img');
  formData.append('dir', UPLOAD_CONFIG.dir);
  formData.append('region', UPLOAD_CONFIG.region);
  formData.append('email', UPLOAD_CONFIG.email);

  const response = await fetch(UPLOAD_API, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.message || 'Unknown upload error');
  }

  let finalUrl = result.cdnUrl;
  if (finalUrl && !finalUrl.startsWith('http')) {
    finalUrl = 'https://' + finalUrl.replace(/^\/\//, '');
  }
  return finalUrl;
};

const generateId = () => {
  return `${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
};

const getOptionColor = (seed: string) => {
  const colors = [
    '#FF9C6E', '#FF7875', '#FFC069', '#95DE64',
    '#5CDBD3', '#69C0FF', '#85A5FF', '#B37FEB', '#FF85C0'
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];

const RankingInput: React.FC<{
  mode: 'ranking' | 'scale';
  items: { id: string; text: string }[];
  cfg: RankingConfig;
  allowAnonymous: boolean;
  userState: UserState;
  setUserState: React.Dispatch<React.SetStateAction<UserState>>;
  setIsSelectingScore?: React.Dispatch<React.SetStateAction<boolean>>;
  activeQuestionId: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  fetchDataAndRender: (qIdOverride?: string | null, forceFull?: boolean) => Promise<void>;
  runWithBusy: (message: string, fn: () => Promise<void>) => Promise<void>;
}> = ({ mode, items, cfg, allowAnonymous, userState, setUserState, setIsSelectingScore, activeQuestionId, showToast, fetchDataAndRender, runWithBusy }) => {
  const { t } = useI18n();
  const [rankingItems, setRankingItems] = useState(() => items);
  const itemsSignatureRef = useRef(items.map(i => i.id).join('|'));
  useEffect(() => {
    const sig = items.map(i => i.id).join('|');
    if (sig !== itemsSignatureRef.current) {
      itemsSignatureRef.current = sig;
      setRankingItems(items);
    }
  }, [items]);

  const [tempScaleSelections, setTempScaleSelections] = useState<Record<string, number>>({});
  const selectingTimerRef = useRef<number | null>(null);

  const submitRanking = async () => {
    if (!activeQuestionId) return;
    const ranking = new Array(rankingItems.length);
    rankingItems.forEach((item, index) => {
      const originalIdx = items.findIndex(i => i.id === item.id);
      if (originalIdx !== -1) {
        ranking[originalIdx] = index + 1;
      }
    });

    // 确保数据结构与后端一致
    // 假设 items 顺序与 ranking 数组索引对应，ranking[i] 是第 i 个 item 的排名
    // 或者直接存储排序后的 ID 列表可能更直观，但这里沿用之前的数字排名逻辑

    await runWithBusy(t('common.submitting'), async () => {
      const newUserState = { ...userState, hasParticipated: true, rankingAnswers: ranking };
      setUserState(newUserState);
      
      await StoreService.setPrivateData(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      const globalData = latestGlobal || { results: { responses: [], participantCount: 0 } };
      if (!globalData.results) globalData.results = { responses: [], participantCount: 0 };
      if (!globalData.results.responses) globalData.results.responses = [];

      const currentUserId = getCurrentUserId();
      if (globalData.results.participantCount === undefined) globalData.results.participantCount = 0;
      if (!allowAnonymous) {
        if (!Array.isArray(globalData.results.participants)) globalData.results.participants = [];
        const participants = (globalData.results.participants as any[]).map((p: any) => (typeof p === 'string' ? { id: p } : p));
        const existed = participants.some((p: any) => p?.id === currentUserId);
        if (!existed) {
          participants.push({ id: currentUserId, name: getCurrentUserName() || t('common.anonymous_user'), avatar: getCurrentUserAvatar() });
        }
        globalData.results.participants = participants;
        globalData.results.participantCount = participants.length;
      } else {
        globalData.results.participantCount = (globalData.results.participantCount || 0) + 1;
      }

      globalData.results.responses.push({ answers: ranking, timestamp: Date.now(), userId: currentUserId });
      
      await StoreService.setGlobalData(activeQuestionId, globalData);
      await fetchDataAndRender(undefined, true);
      showToast(t('ranking.ranking_submit_success'), 'success');
    });
  };

  const selectScaleScore = (itemId: string, score: number) => {
    if (selectingTimerRef.current) {
      clearTimeout(selectingTimerRef.current);
      selectingTimerRef.current = null;
    }
    setIsSelectingScore?.(true);
    setTempScaleSelections(prev => {
      const newState = { ...prev, [itemId]: score };
      return newState;
    });
    // 直接更新 userState 中的临时数据，虽然这一步在当前组件渲染中不是必须的，
    // 但保持数据同步是个好习惯，特别是如果 RankingInput 被卸载重装时
    setUserState(prev => ({
      ...prev,
      tempScaleSelections: { ...(prev.tempScaleSelections || {}), [itemId]: score }
    }));
    selectingTimerRef.current = window.setTimeout(() => {
      setIsSelectingScore?.(false);
      selectingTimerRef.current = null;
    }, 800);
  };

  const submitScale = async () => {
    if (!activeQuestionId) return;
    const allAnswered = items.every(item => tempScaleSelections[item.id] !== undefined);
    if (!allAnswered) return showToast(t('ranking.scale_incomplete_error'), 'error');
    await runWithBusy(t('common.submitting'), async () => {
      setIsSelectingScore?.(true);
      const newUserState = { ...userState, hasParticipated: true, rankingAnswers: { ...tempScaleSelections } };
      setUserState(newUserState);

      await StoreService.setPrivateData(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      const globalData = latestGlobal || { results: { responses: [], participantCount: 0 } };
      if (!globalData.results) globalData.results = { responses: [], participantCount: 0 };
      if (!globalData.results.responses) globalData.results.responses = [];

      const currentUserId = getCurrentUserId();
      if (globalData.results.participantCount === undefined) globalData.results.participantCount = 0;
      if (!allowAnonymous) {
        if (!Array.isArray(globalData.results.participants)) globalData.results.participants = [];
        const participants = (globalData.results.participants as any[]).map((p: any) => (typeof p === 'string' ? { id: p } : p));
        const existed = participants.some((p: any) => p?.id === currentUserId);
        if (!existed) {
          participants.push({ id: currentUserId, name: getCurrentUserName() || t('common.anonymous_user'), avatar: getCurrentUserAvatar() });
        }
        globalData.results.participants = participants;
        globalData.results.participantCount = participants.length;
      } else {
        globalData.results.participantCount = (globalData.results.participantCount || 0) + 1;
      }

      globalData.results.responses.push({ answers: { ...tempScaleSelections }, timestamp: Date.now(), userId: currentUserId });
      
      await StoreService.setGlobalData(activeQuestionId, globalData);
      await fetchDataAndRender(undefined, true);
      showToast(t('ranking.scale_submit_success'), 'success');
      setIsSelectingScore?.(false);
    });
  };

  if (mode === 'ranking') {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-xs text-blue-700 font-medium">{t('ranking.rank_hint')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 mb-6 flex-1 overflow-y-auto pr-1">
          {rankingItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm transition-all select-none hover:shadow-md"
            >
              <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold shadow-sm">
                {i + 1}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-700">{item.text}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${i === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setRankingItems(prev => arrayMove(prev, i, i - 1))}
                  disabled={i === 0}
                  type="button"
                  aria-label={t('ranking.move_up')}
                >
                  ↑
                </button>
                <button
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${i === rankingItems.length - 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setRankingItems(prev => arrayMove(prev, i, i + 1))}
                  disabled={i === rankingItems.length - 1}
                  type="button"
                  aria-label={t('ranking.move_down')}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center sticky bottom-0 bg-white pt-2 pb-4 shrink-0 border-t border-gray-100">
          <button 
            className="lark-btn lark-btn-primary w-full shadow-lg !h-11 text-base font-bold transition-transform active:scale-[0.98]" 
            onClick={submitRanking}
          >
            {t('ranking.submit_ranking')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">{item.text}</div>
              <div className="flex justify-between gap-1">
              {Array.from(
                { length: Math.max(0, (cfg.scaleMax || 5) - (cfg.scaleMin || 1) + 1) },
                (_, i) => (cfg.scaleMin || 1) + i
              ).map(s => (
                <button
                  key={s}
                  className={`scale-btn flex-1 h-10 rounded text-sm font-medium transition-all ${(tempScaleSelections?.[item.id] || 0) === s ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'}`}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectScaleScore(item.id, s);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectScaleScore(item.id, s);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectScaleScore(item.id, s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {cfg.scaleLabels?.[tempScaleSelections?.[item.id]] && (
              <div className="mt-2 text-xs text-center text-blue-600">{cfg.scaleLabels[tempScaleSelections[item.id]]}</div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <button type="button" className="lark-btn lark-btn-primary !px-6" onClick={submitScale}>{t('ranking.submit_rating')}</button>
      </div>
    </div>
  );
};

  const PollViewer: React.FC<{
    config: EditorDraft;
    results: any;
    userState: UserState;
    tempSelectedOptions: string[];
    handleOptionClick: (optId: string) => void;
    submitVote: () => Promise<void>;
    setPreviewImage: (url: string | null) => void;
    renderHeaderTags: (label: string, color: string, isAnonymous?: boolean) => JSX.Element;
  }> = ({ config, results, userState, tempSelectedOptions, handleOptionClick, submitVote, setPreviewImage, renderHeaderTags }) => {
    const { t } = useI18n();
    const isEnded = config.deadline ? new Date() > new Date(config.deadline) : false;
    const isMulti = config.allowMultiple;
    const isAnonymous = Boolean((config as any)?.allowAnonymous);
    const maxSel = config.maxSelections || 2;
    const minSel = config.minSelections || 1;
    const hasVoted = userState.hasParticipated;

    // 使用 useMemo 缓存计算结果，避免不必要的重渲染
    const { totalVotes, dataEntries } = React.useMemo(() => {
      let total = 0;
      const entries = (config.options || []).map(opt => {
        const votes = results?.[opt.id] || 0;
        total += votes;
        return { id: opt.id, label: opt.text || t('poll.unnamed_option'), value: votes };
      });
      return { 
        totalVotes: total, 
        dataEntries: entries
      };
    }, [config.options, results, t]);

    const tagLabel = isMulti ? t('poll.multi_tag', { min: minSel, max: maxSel }) : t('poll.single_tag');

    return (
      <div>
        {renderHeaderTags(tagLabel, 'bg-blue-50 text-blue-600 border-blue-100', isAnonymous)}

        {(hasVoted || isEnded) && totalVotes > 0 && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">{t('poll.results_summary')}</div>
            <div className="flex flex-col gap-3">
              {dataEntries.map(entry => {
                const percent = Math.round((entry.value / totalVotes) * 100);
                const isWinner = entry.value === Math.max(...dataEntries.map(e => e.value));
                const voters = !isAnonymous ? (results?.optionVoters?.[entry.id] || []) : [];
                return (
                  <div key={entry.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">{entry.label}</span>
                      <span className={`text-sm font-bold ${isWinner ? 'text-blue-600' : 'text-gray-500'}`}>
                        {t('poll.vote_count', { count: entry.value })} ({percent}%)
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: getOptionColor(entry.id) }}
                      />
                    </div>
                    {!isAnonymous && Array.isArray(voters) && voters.length > 0 ? (
                      <div className="mt-2 flex justify-end">
                        <AvatarStack participants={voters} max={12} sizeClassName="w-6 h-6" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {config.layout === 'card' ? (
          <div className="card-layout-grid">
            {config.options.map(opt => {
              const votes = results?.[opt.id] || 0;
              const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
              const isVoted = userState.votedOptions?.includes(opt.id);
              const isTempSelected = !userState.hasParticipated && tempSelectedOptions.includes(opt.id);
              const containerClass = isVoted ? 'voted' : (isTempSelected ? 'selected-temp' : '');
              const fallbackBg = getOptionColor(opt.id);
              const firstChar = opt.text ? opt.text.charAt(0) : '?';

              return (
                <div
                  key={opt.id}
                  className={`poll-card ${containerClass} ${isEnded && !isVoted ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                  onClick={() => handleOptionClick(opt.id)}
                >
                  <div className="poll-card-img-wrapper">
                    {opt.imageUrl ? (
                      <>
                        <img src={opt.imageUrl} className="poll-card-img" />
                        <button
                          className="poll-preview-btn shadow-md"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(opt.imageUrl); }}
                          title={t('common.view_image')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="poll-card-fallback" style={{ backgroundColor: fallbackBg }}>{firstChar}</div>
                    )}
                  </div>
                  <div className="poll-card-content">
                    <div className="flex items-center gap-2">
                      {!userState.hasParticipated && !isEnded && (
                        <div className={`poll-indicator shadow-inner shrink-0 ${isMulti ? 'checkbox' : 'radio'}`} />
                      )}
                      <span className="font-medium text-gray-800 line-clamp-1 text-sm">{opt.text || t('poll.option_fallback')}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      {(hasVoted || isEnded) ? (
                        <>
                          <span className="text-[10px] text-gray-500">{t('poll.vote_count', { count: votes })}</span>
                          <span className="text-[10px] font-bold text-blue-600">{percent}%</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-400">{t('poll.results_after_submit')}</span>
                      )}
                    </div>
                    {(hasVoted || isEnded) && (
                      <div className="poll-card-progress" style={{ width: `${percent}%` }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {config.options.map(opt => {
              const votes = results?.[opt.id] || 0;
              const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
              const isVoted = userState.votedOptions?.includes(opt.id);
              const isTempSelected = !userState.hasParticipated && tempSelectedOptions.includes(opt.id);
              const containerClass = isVoted ? 'voted' : (isTempSelected ? 'selected-temp' : '');

              return (
                <div
                  key={opt.id}
                  className={`poll-bar-container bg-gray-50 rounded-lg shadow-sm border ${containerClass} ${isEnded && !isVoted ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                  onClick={() => handleOptionClick(opt.id)}
                >
                  {(hasVoted || isEnded) && (
                    <div className="poll-bar-fill rounded-lg transition-all duration-500 ease-out" style={{ width: `${percent}%` }} />
                  )}
                  <div className="poll-bar-content relative z-10">
                    <div className="flex items-center gap-3 w-3/4">
                      {!userState.hasParticipated && !isEnded && (
                        <div className={`poll-indicator shadow-inner ${isMulti ? 'checkbox' : 'radio'}`} />
                      )}
                      {opt.imageUrl && (
                        <img
                          src={opt.imageUrl}
                          className="w-8 h-8 rounded object-cover border border-gray-200 shadow-sm bg-white shrink-0 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(opt.imageUrl); }}
                        />
                      )}
                      <span className="font-medium text-gray-800 truncate">{opt.text || t('poll.option_fallback')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(hasVoted || isEnded) ? (
                        <>
                          <span className="text-xs font-bold text-gray-500">{t('poll.vote_count', { count: votes })}</span>
                          <span className="text-xs font-bold text-blue-600">{percent}%</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">{t('poll.results_after_submit')}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!userState.hasParticipated && !isEnded && (
          <div className="mt-8 sticky bottom-4 z-20">
            <button
              className="lark-btn lark-btn-primary w-full shadow-lg !h-12 text-base font-bold"
              onClick={submitVote}
              disabled={tempSelectedOptions.length === 0}
            >
              {t('poll.confirm_vote')}
            </button>
          </div>
        )}
      </div>
    );
  };

const AppInner: React.FC = () => {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<'loading' | 'editor' | 'viewer'>('loading');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [config, setConfig] = useState<EditorDraft | null>(null);
  const [results, setResults] = useState<any>(null);
  const [createdBy, setCreatedBy] = useState<{ id: string; name: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [isUserReady, setIsUserReady] = useState(false);
  const [userState, setUserState] = useState<UserState>({ hasParticipated: false });
  const [tempSelectedOptions, setTempSelectedOptions] = useState<string[]>([]);
  const [wordCloudInput, setWordCloudInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isSelectingScore, setIsSelectingScore] = useState(false);
  const [editorDraft, setEditorDraft] = useState<EditorDraft>(() => createInitialDraft(t));
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [uploadingOptId, setUploadingOptId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; show: boolean; type: 'success' | 'error' | 'info' }>({
    message: '',
    show: false,
    type: 'info'
  });
  const toastTimeoutRef = useRef<number | null>(null);
  const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
  const [editorStatus, setEditorStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string }>({
    type: 'info',
    message: ''
  });
  const [busy, setBusy] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const busyTimeoutRef = useRef<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);
  const pendingUpvotesRef = useRef<Record<string, boolean>>({});
  const draftTouchedRef = useRef(false);
  const rankingDraftCacheRef = useRef<Record<'ranking' | 'scale', { title: string; deadline: string; allowAnonymous: boolean; rankingConfig: RankingConfig } | undefined>>({
    ranking: undefined,
    scale: undefined
  });
  const appRef = useRef<HTMLDivElement | null>(null);
  const lastSyncedHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!draftTouchedRef.current) {
      setEditorDraft(createInitialDraft(t));
      setEditorErrors({});
      setEditorStatus({ type: 'info', message: '' });
    }
  }, [t]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, show: true, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast({ message: '', show: false, type: 'info' });
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  const renderStatusIcon = (type: 'success' | 'error' | 'info', className: string) => {
    if (type === 'success') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (type === 'error') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A2 2 0 004.53 20h14.94a2 2 0 001.74-3.14l-7.5-13a2 2 0 00-3.42 0z" />
        </svg>
      );
    }
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const runWithBusy = useCallback(async (message: string, fn: () => Promise<void>) => {
    if (busyTimeoutRef.current) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
    const start = Date.now();
    setBusy({ show: true, message });
    try {
      await fn();
    } finally {
      const elapsed = Date.now() - start;
      const delay = elapsed < 350 ? 350 - elapsed : 0;
      busyTimeoutRef.current = window.setTimeout(() => {
        setBusy({ show: false, message: '' });
        busyTimeoutRef.current = null;
      }, delay);
    }
  }, []);

  const getLocalUserStateKey = useCallback((qId: string) => {
    const uid = getCurrentUserId();
    return `InteractionUserState_v1_${qId}_${uid}`;
  }, []);

  const readLocalUserState = useCallback((qId: string) => {
    try {
      const raw = localStorage.getItem(getLocalUserStateKey(qId));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') return data;
    } catch (e) {}
    return null;
  }, [getLocalUserStateKey]);

  const persistLocalUserState = useCallback((qId: string, state: any) => {
    try {
      localStorage.setItem(getLocalUserStateKey(qId), JSON.stringify(state));
    } catch (e) {}
  }, [getLocalUserStateKey]);

  const fetchDataAndRender = useCallback(
    async (qIdOverride?: string | null, forceFull?: boolean) => {
      const qId = qIdOverride ?? activeQuestionId;
      if (!qId) {
        setMode('editor');
        return;
      }

      const [globalData, privateData] = await Promise.all([
        StoreService.getGlobalData(qId),
        StoreService.getPrivateData(qId)
      ]);

      if (!globalData) {
        setMode('editor');
        return;
      }

      setActiveQuestionId(qId);
      setConfig(globalData.config);
      setCreatedBy(globalData.createdBy || null);
      if (forceFull || (!isUserTyping && !isSelectingScore)) {
        setResults(globalData.results);
      } else {
        setResults((prev: any) => ({
          ...(prev || {}),
          participantCount: globalData.results?.participantCount || 0,
          participants: globalData.results?.participants || (prev || {}).participants
        }));
      }
      setUserState(privateData || readLocalUserState(qId) || { hasParticipated: false, votedOptions: [] });

      if (mode !== 'viewer') setMode('viewer');
    },
    [activeQuestionId, isSelectingScore, isUserTyping, mode, readLocalUserState]
  );

  useEffect(() => {
    if (!isUserReady) return;
    (async () => {
      const qId = await StoreService.getQuestionId();
      if (!qId) {
        setMode('editor');
      } else {
        await fetchDataAndRender(qId);
      }
    })();
  }, [isUserReady]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      if (busyTimeoutRef.current) {
        clearTimeout(busyTimeoutRef.current);
        busyTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [uid, info] = await Promise.all([
          DocMiniApp.Service.User.getUserId(),
          DocMiniApp.Service.User.getUserInfo()
        ]);
        const avatar =
          (info as any)?.avatarUrl ??
          (info as any)?.avatar_url ??
          (info as any)?.avatar ??
          '';
        setCachedUser({ id: uid || null, name: info?.nickName || null, avatar: avatar || null });
        setCurrentUser({ id: uid || 'anonymous', name: info?.nickName || t('common.anonymous_user'), avatar });
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsUserReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = async () => {
      const qId = await StoreService.getQuestionId();
      await fetchDataAndRender(qId);
    };
    DocMiniApp.Interaction.onDataChange(handler);
    return () => {
      DocMiniApp.Interaction.offDataChange(handler);
    };
  }, [fetchDataAndRender]);

  useEffect(() => {
    if (mode === 'viewer' && activeQuestionId && config && config.deadline) {
      const deadline = new Date(config.deadline).getTime();
      const now = Date.now();
      
      // 如果已经结束，不需要定时器
      if (now > deadline) return;

      // 计算距离结束的时间，设置一个定时器在结束时触发刷新
      const delay = deadline - now;
      // 限制最大延时为24小时，避免定时器溢出问题
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const timerId = setTimeout(() => {
          fetchDataAndRender(activeQuestionId);
        }, delay + 1000); // 延迟1秒确保服务端状态也已更新
        
        return () => clearTimeout(timerId);
      }
    }
  }, [mode, activeQuestionId, config, fetchDataAndRender]);

  useEffect(() => {
    if (mode === 'viewer' && activeQuestionId) {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = window.setInterval(() => {
        // 如果用户正在交互（打字或评分），则只静默更新参与人数，不重绘整个列表
        // 这样可以避免界面闪烁
        if (document.visibilityState !== 'visible') return;
        if (!isUserTyping && !isSelectingScore) {
          if (pollInFlightRef.current) return;
          pollInFlightRef.current = true;
          fetchDataAndRender(activeQuestionId)
            .catch(() => {})
            .finally(() => {
              pollInFlightRef.current = false;
            });
        }
      }, 4000);
    }
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [mode, activeQuestionId, fetchDataAndRender, isUserTyping, isSelectingScore]);

  const syncContainerHeight = useCallback(() => {
    const el = appRef.current;
    if (!el) return;
    const rectH = el.getBoundingClientRect().height;
    const elScrollH = el.scrollHeight;
    // 增加额外的底部 padding，确保内容不被截断，特别是对于移动端或不同缩放比例
    const height = Math.ceil(Math.max(elScrollH, rectH) + 20);
    const last = lastSyncedHeightRef.current;
    
    // 降低触发阈值，确保微小的变化也能同步
    if (!height || Math.abs(height - last) < 1) return;
    
    // 确保最小高度大于 initialHeight (400)
    const finalHeight = Math.max(height, 400);
    
    lastSyncedHeightRef.current = finalHeight;
    Promise.resolve(Bridge.updateHeight(finalHeight)).catch(() => {});
  }, []);

  useEffect(() => {
    const el = appRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let rafId = 0;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => syncContainerHeight());
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [syncContainerHeight]);

  useEffect(() => {
    let rafId = 0;
    rafId = requestAnimationFrame(() => syncContainerHeight());
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [mode, syncContainerHeight]);

  const handleTabClick = (type: string) => {
    draftTouchedRef.current = true;
    setEditorErrors({});
    setEditorStatus({ type: 'info', message: '' });
    if (type === 'ranking_sort') {
      const currentMode = editorDraft.rankingConfig.mode;
      rankingDraftCacheRef.current[currentMode] = {
        title: editorDraft.title,
        deadline: editorDraft.deadline,
        allowAnonymous: editorDraft.allowAnonymous,
        rankingConfig: editorDraft.rankingConfig
      };
      const cached = rankingDraftCacheRef.current.ranking;
      if (cached) {
        setEditorDraft(prev => ({ ...prev, type: 'ranking', title: cached.title, deadline: cached.deadline, allowAnonymous: cached.allowAnonymous, rankingConfig: { ...cached.rankingConfig, mode: 'ranking' } }));
      } else {
        setEditorDraft(prev => ({ ...prev, type: 'ranking', title: '', rankingConfig: { ...prev.rankingConfig, mode: 'ranking' } }));
      }
      return;
    }
    if (type === 'ranking_scale') {
      const currentMode = editorDraft.rankingConfig.mode;
      rankingDraftCacheRef.current[currentMode] = {
        title: editorDraft.title,
        deadline: editorDraft.deadline,
        allowAnonymous: editorDraft.allowAnonymous,
        rankingConfig: editorDraft.rankingConfig
      };
      const cached = rankingDraftCacheRef.current.scale;
      if (cached) {
        setEditorDraft(prev => ({ ...prev, type: 'ranking', title: cached.title, deadline: cached.deadline, allowAnonymous: cached.allowAnonymous, rankingConfig: { ...cached.rankingConfig, mode: 'scale' } }));
      } else {
        setEditorDraft(prev => ({ ...prev, type: 'ranking', title: '', rankingConfig: { ...prev.rankingConfig, mode: 'scale' } }));
      }
      return;
    }
    setEditorDraft(prev => ({ ...prev, type: type as EditorDraft['type'] }));
  };

  const updateDraft = (updates: Partial<EditorDraft>) => {
    draftTouchedRef.current = true;
    if (updates.title !== undefined) {
      setEditorErrors(prev => {
        if (!prev.title) return prev;
        const next = { ...prev };
        delete next.title;
        return next;
      });
    }
    setEditorDraft(prev => ({ ...prev, ...updates }));
  };

  const addOption = () => {
    draftTouchedRef.current = true;
    setEditorDraft(prev => ({
      ...prev,
      options: [...prev.options, { id: `opt_${Date.now()}`, text: '', imageUrl: '' }]
    }));
  };

  const deleteOption = (id: string) => {
    if (editorDraft.options.length <= 2) return;
    draftTouchedRef.current = true;
    setEditorDraft(prev => ({
      ...prev,
      options: prev.options.filter(o => o.id !== id)
    }));
  };

  const updateOptionText = (id: string, text: string) => {
    draftTouchedRef.current = true;
    setEditorErrors(prev => {
      const key = `opt_${id}`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditorDraft(prev => ({
      ...prev,
      options: prev.options.map(o => o.id === id ? { ...o, text } : o)
    }));
  };

  const triggerImageUpload = (optId: string) => {
    setUploadingOptId(optId);
    const input = document.getElementById('image-upload-input') as HTMLInputElement;
    input?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingOptId) return;

    // 立即设置上传状态
    const currentOptId = uploadingOptId;
    setUploadingMap(prev => ({ ...prev, [currentOptId]: true }));

    try {
      const cdnUrl = await uploadToCDN(file);
      draftTouchedRef.current = true;
      setEditorDraft(prev => ({
        ...prev,
        options: prev.options.map(o => o.id === currentOptId ? { ...o, imageUrl: cdnUrl } : o)
      }));
      showToast(t('common.upload_success'), 'success');
    } catch (err) {
      showToast(t('error.image_upload_failed'), 'error');
    } finally {
      // 这里的清理逻辑需要小心，确保 UI 有机会渲染进度条
      // 如果上传太快，进度条可能一闪而过
      e.target.value = '';
      setUploadingMap(prev => {
        const newMap = { ...prev };
        delete newMap[currentOptId];
        return newMap;
      });
      // 只有当所有上传都完成时才清空 currentOptId，或者这里不清除也可以，依靠 uploadingMap 控制
      if (uploadingOptId === currentOptId) {
        setUploadingOptId(null);
      }
    }
  };

  const removeImage = (optId: string) => {
    draftTouchedRef.current = true;
    setEditorDraft(prev => ({
      ...prev,
      options: prev.options.map(o => o.id === optId ? { ...o, imageUrl: '' } : o)
    }));
  };

  const saveAndPublish = async () => {
    if (Object.values(uploadingMap).some(v => v)) {
      return showToast(t('error.image_uploading'), 'info');
    }

    const type = editorDraft.type;
    const errors: Record<string, string> = {};

    if (type === 'live_polling') {
      if (!editorDraft.title.trim()) errors.title = t('error.poll_theme_required');
      const emptyOpts = editorDraft.options.filter(o => !o.text.trim() && !o.imageUrl);
      if (emptyOpts.length > 0) {
        emptyOpts.forEach(o => {
          errors[`opt_${o.id}`] = t('error.poll_option_required');
        });
      }
      if (editorDraft.allowMultiple && editorDraft.maxSelections > editorDraft.options.length) {
        editorDraft.maxSelections = editorDraft.options.length;
      }
    } else if (type === 'word_cloud') {
      if (!editorDraft.title.trim()) errors.title = t('error.word_cloud_theme_required');
    } else if (type === 'qa') {
      if (!editorDraft.title.trim()) errors.title = t('error.qa_theme_required');
    } else if (type === 'ranking') {
      if (!editorDraft.title.trim()) errors.title = t('error.ranking_title_required');
      if (!editorDraft.rankingConfig?.items || editorDraft.rankingConfig.items.length < 2) {
        errors.ranking_items = t('error.ranking_min_items', { min: 2 });
      }
      const hasEmptyItem = editorDraft.rankingConfig.items.some(i => !i.text.trim());
      if (hasEmptyItem) {
        editorDraft.rankingConfig.items.forEach(i => {
          if (!i.text.trim()) errors[`ranking_${i.id}`] = t('error.all_items_required');
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      const firstMsg = errors.title || errors.ranking_items || Object.values(errors)[0] || t('error.check_required_fields');
      setEditorErrors(errors);
      setEditorStatus({ type: 'error', message: firstMsg });
      return showToast(firstMsg, 'error');
    }

    const qId = generateId();
    const initResults: any = {};

    if (type === 'live_polling') {
      editorDraft.options.forEach(o => initResults[o.id] = 0);
      initResults.participantCount = 0;
      initResults.participants = [];
      initResults.optionVoters = {};
    } else if (type === 'word_cloud') {
      initResults.words = {};
      initResults.participantCount = 0;
      initResults.participants = [];
    } else if (type === 'qa') {
      initResults.questions = [];
      initResults.participantCount = 0;
      initResults.participants = [];
    } else if (type === 'ranking') {
      initResults.responses = [];
      initResults.participantCount = 0;
      initResults.participants = [];
    }

    const globalPayload = {
      questionId: qId,
      type: type,
      createdBy: {
        id: getCurrentUserId(),
        name: getCurrentUserName() || t('common.anonymous_user')
      },
      config: JSON.parse(JSON.stringify(editorDraft)),
      results: initResults
    };

    await StoreService.setGlobalData(qId, globalPayload);
    await StoreService.setQuestionId(qId);

    await fetchDataAndRender(qId);
    setEditorStatus({ type: 'success', message: t('status.published') });
    showToast(t('toast.publish_success'), 'success');
  };

  const handleOptionClick = (optId: string) => {
    if (!config) return;
    if (config.deadline && new Date() > new Date(config.deadline)) {
      return showToast(t('poll.ended'), 'info');
    }
    if (userState.hasParticipated) return;

    const isMulti = config.allowMultiple;
    const maxSel = isMulti ? (config.maxSelections || 2) : 1;

    const idx = tempSelectedOptions.indexOf(optId);
    if (idx > -1) {
      if (isMulti) {
        setTempSelectedOptions(prev => prev.filter(id => id !== optId));
      }
    } else {
      if (!isMulti) {
        setTempSelectedOptions([optId]);
      } else {
        if (tempSelectedOptions.length >= maxSel) {
          return showToast(t('poll.max_select_error', { max: maxSel }), 'info');
        }
        setTempSelectedOptions(prev => [...prev, optId]);
      }
    }
  };

  const submitVote = async () => {
    const isMulti = config?.allowMultiple;
    const minSel = isMulti ? (config?.minSelections || 1) : 1;
    if (tempSelectedOptions.length < minSel) {
      return showToast(isMulti ? t('poll.min_select_error', { min: minSel }) : t('poll.select_one'), 'error');
    }

    if (!activeQuestionId) return;
    const selected = [...tempSelectedOptions];
    const isAnonymous = Boolean((config as any)?.allowAnonymous);
    const me = { id: getCurrentUserId(), name: getCurrentUserName() || t('common.anonymous_user'), avatar: getCurrentUserAvatar() };
    await runWithBusy(t('common.submitting'), async () => {
      const newUserState = { ...userState, hasParticipated: true, votedOptions: selected };
      setUserState(newUserState);

      const newResults = { ...(results || {}) };
      selected.forEach(optId => {
        if (!newResults[optId]) newResults[optId] = 0;
        newResults[optId]++;
      });
      if (!isAnonymous) {
        const participantsRaw = Array.isArray(newResults.participants) ? newResults.participants : [];
        const participants = participantsRaw.map((p: any) => (typeof p === 'string' ? { id: p } : p));
        const existed = participants.some((p: any) => p?.id === me.id);
        if (!existed) participants.push(me);
        newResults.participants = participants;
        newResults.participantCount = participants.length;
        const optionVoters = (newResults.optionVoters && typeof newResults.optionVoters === 'object') ? { ...newResults.optionVoters } : {};
        selected.forEach(optId => {
          const rawList = Array.isArray(optionVoters[optId]) ? optionVoters[optId] : [];
          const list = rawList.map((p: any) => (typeof p === 'string' ? { id: p } : p));
          const existed = list.some((p: any) => p?.id === me.id);
          if (!existed) list.push(me);
          optionVoters[optId] = list;
        });
        newResults.optionVoters = optionVoters;
      } else {
        newResults.participantCount = (newResults.participantCount || 0) + 1;
      }
      setResults(newResults);

      setTempSelectedOptions([]);

      await StoreService.setPrivateData(activeQuestionId, newUserState);
      persistLocalUserState(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      if (latestGlobal) {
        selected.forEach(optId => {
          if (!latestGlobal.results[optId]) latestGlobal.results[optId] = 0;
          latestGlobal.results[optId]++;
        });
        if (!isAnonymous) {
          if (!Array.isArray(latestGlobal.results.participants)) latestGlobal.results.participants = [];
          const participants = (latestGlobal.results.participants as any[]).map((p: any) => (typeof p === 'string' ? { id: p } : p));
          const existed = participants.some((p: any) => p?.id === me.id);
          if (!existed) participants.push(me);
          latestGlobal.results.participants = participants;
          latestGlobal.results.participantCount = participants.length;
          if (!latestGlobal.results.optionVoters || typeof latestGlobal.results.optionVoters !== 'object') latestGlobal.results.optionVoters = {};
          selected.forEach(optId => {
            const rawList = Array.isArray(latestGlobal.results.optionVoters[optId]) ? latestGlobal.results.optionVoters[optId] : [];
            const list = rawList.map((p: any) => (typeof p === 'string' ? { id: p } : p));
            const existed = list.some((p: any) => p?.id === me.id);
            if (!existed) list.push(me);
            latestGlobal.results.optionVoters[optId] = list;
          });
        } else {
          latestGlobal.results.participantCount = (latestGlobal.results.participantCount || 0) + 1;
        }
        await StoreService.setGlobalData(activeQuestionId, latestGlobal);
      }

      await fetchDataAndRender();
      showToast(t('common.submit_success'), 'success');
    });
  };

  const submitWord = async () => {
    const word = wordCloudInput.trim();
    if (!word) return;
    if (!activeQuestionId) return;

    if (userState.submittedWords?.includes(word)) {
      return showToast(t('word_cloud.duplicate_word'), 'info');
    }

    const isAnonymous = Boolean((config as any)?.allowAnonymous);
    const isFirst = !userState.hasParticipated;
    const me = { id: getCurrentUserId(), name: getCurrentUserName() || t('common.anonymous_user'), avatar: getCurrentUserAvatar() };
    await runWithBusy(t('common.submitting'), async () => {
      const newUserState = {
        ...userState,
        hasParticipated: true,
        submittedWords: [...(userState.submittedWords || []), word]
      };
      setUserState(newUserState);
      setWordCloudInput('');

      await StoreService.setPrivateData(activeQuestionId, newUserState);
      persistLocalUserState(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      if (latestGlobal) {
        if (!latestGlobal.results.words) latestGlobal.results.words = {};
        if (!latestGlobal.results.words[word]) latestGlobal.results.words[word] = 0;
        latestGlobal.results.words[word]++;
        if (isFirst) {
          if (!isAnonymous) {
            if (!Array.isArray(latestGlobal.results.participants)) latestGlobal.results.participants = [];
            const participants = (latestGlobal.results.participants as any[]).map((p: any) => (typeof p === 'string' ? { id: p } : p));
            const existed = participants.some((p: any) => p?.id === me.id);
            if (!existed) participants.push(me);
            latestGlobal.results.participants = participants;
            latestGlobal.results.participantCount = participants.length;
          } else {
            latestGlobal.results.participantCount = (latestGlobal.results.participantCount || 0) + 1;
          }
        } else if (!isAnonymous && Array.isArray(latestGlobal.results.participants)) {
          latestGlobal.results.participantCount = latestGlobal.results.participants.length;
        }
        await StoreService.setGlobalData(activeQuestionId, latestGlobal);
      }

      setIsUserTyping(false);
      await fetchDataAndRender(undefined, true);
      showToast(t('common.submit_success'), 'success');
    });
  };

  const submitQuestion = async () => {
    const text = questionInput.trim();
    if (!text || !activeQuestionId) return showToast(t('qa.question_required'), 'error');

    const isAnonymous = Boolean(config?.qaConfig?.allowAnonymous);
    const me = { id: getCurrentUserId(), name: getCurrentUserName() || t('common.anonymous_user'), avatar: getCurrentUserAvatar() || currentUser?.avatar || '' };
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text,
      author: isAnonymous ? null : me.name,
      authorId: isAnonymous ? undefined : me.id,
      authorAvatar: isAnonymous ? undefined : me.avatar,
      upvotes: 0,
      timestamp: Date.now()
    };

    await runWithBusy(t('common.submitting'), async () => {
      const newUserState = {
        ...userState,
        hasParticipated: true,
        submittedQuestions: [...(userState.submittedQuestions || []), newQuestion.id]
      };
      setUserState(newUserState);
      setQuestionInput('');

      await StoreService.setPrivateData(activeQuestionId, newUserState);
      persistLocalUserState(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      if (latestGlobal) {
        if (!latestGlobal.results.questions) latestGlobal.results.questions = [];
        latestGlobal.results.questions.push(newQuestion);
        if (!isAnonymous) {
          if (!Array.isArray(latestGlobal.results.participants)) latestGlobal.results.participants = [];
          const participants = (latestGlobal.results.participants as any[]).map((p: any) => (typeof p === 'string' ? { id: p } : p));
          const existed = participants.some((p: any) => p?.id === me.id);
          if (!existed) participants.push(me);
          latestGlobal.results.participants = participants;
          latestGlobal.results.participantCount = participants.length;
        } else {
          latestGlobal.results.participantCount = (latestGlobal.results.participantCount || 0) + 1;
        }
        await StoreService.setGlobalData(activeQuestionId, latestGlobal);
      }

      await fetchDataAndRender(undefined, true);
      showToast(t('qa.question_submit_success'), 'success');
    });
  };

  const upvoteQuestion = async (questionId: string) => {
    if (!activeQuestionId) return;
    if (pendingUpvotesRef.current[questionId]) return;
    if (userState.upvotedQuestions?.includes(questionId)) {
      return showToast(t('qa.already_liked'), 'info');
    }

    pendingUpvotesRef.current[questionId] = true;
    const newUserState = {
      ...userState,
      upvotedQuestions: [...(userState.upvotedQuestions || []), questionId]
    };
    setUserState(newUserState);

    try {
      await StoreService.setPrivateData(activeQuestionId, newUserState);
      persistLocalUserState(activeQuestionId, newUserState);

      const latestGlobal = await StoreService.getGlobalData(activeQuestionId);
      if (latestGlobal && latestGlobal.results.questions) {
        const q = latestGlobal.results.questions.find((q: Question) => q.id === questionId);
        if (q) {
          const uid = getCurrentUserId();
          if (!q.upvotedUserIds) q.upvotedUserIds = [];
          if (!q.upvotedUserIds.includes(uid)) {
            q.upvotedUserIds.push(uid);
            q.upvotes = (q.upvotes || 0) + 1;
            await StoreService.setGlobalData(activeQuestionId, latestGlobal);
          }
        }
      }
      await fetchDataAndRender(undefined, true);
    } finally {
      pendingUpvotesRef.current[questionId] = false;
    }
  };

  const renderPollEditor = () => (
    <div>
      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.poll_theme')}</label>
        <input
          type="text"
          className={`lark-input font-medium ${editorErrors.title ? 'lark-input-error' : ''}`}
          placeholder={t('placeholder.poll_theme')}
          value={editorDraft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
        />
      </div>

      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('section.advanced_settings')}</label>
        <div className="flex flex-col gap-4 bg-gray-50 p-3 rounded border border-gray-100 shadow-sm">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                checked={editorDraft.allowMultiple}
                onChange={(e) => updateDraft({ allowMultiple: e.target.checked })}
              />
              <span className="text-sm font-medium">{t('poll.allow_multiple')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                checked={editorDraft.allowAnonymous}
                onChange={(e) => updateDraft({ allowAnonymous: e.target.checked })}
              />
              <span className="text-sm font-medium">{t('common.anonymous_participation')}</span>
            </label>
            {editorDraft.allowMultiple && (
              <div className="flex items-center gap-4 pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{t('poll.min_select')}</span>
                  <input
                    type="number"
                    className="lark-input !w-14 !px-1 !text-center shadow-inner text-xs"
                    min={1}
                    max={editorDraft.options.length}
                    value={editorDraft.minSelections}
                    onChange={(e) => updateDraft({ minSelections: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{t('poll.max_select')}</span>
                  <input
                    type="number"
                    className="lark-input !w-14 !px-1 !text-center shadow-inner text-xs"
                    min={1}
                    max={editorDraft.options.length}
                    value={editorDraft.maxSelections}
                    onChange={(e) => updateDraft({ maxSelections: parseInt(e.target.value) || 2 })}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500">{t('poll.option_layout')}</span>
              <div className="flex p-0.5 bg-gray-200 rounded-md w-max">
                <button
                  className={`px-3 py-1 text-xs rounded transition-all ${editorDraft.layout === 'list' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                  onClick={() => updateDraft({ layout: 'list' })}
                >
                  {t('poll.layout_list')}
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded transition-all ${editorDraft.layout === 'card' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                  onClick={() => updateDraft({ layout: 'card' })}
                >
                  {t('poll.layout_card')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('label.deadline')} <span className="text-xs text-gray-400 font-normal ml-1">({t('hint.deadline_optional')})</span></label>
        <input
          type="datetime-local"
          className="lark-input w-max text-sm"
          lang={locale}
          value={editorDraft.deadline}
          onChange={(e) => updateDraft({ deadline: e.target.value })}
        />
      </div>

      <div className="mb-5 flex flex-col items-start w-full">
        <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.poll_options')}</label>
        {editorDraft.layout === 'card' ? (
          <div className="card-layout-grid w-full">
            {editorDraft.options.map((opt, i) => {
              const isError = Boolean(editorErrors[`opt_${opt.id}`]);
              const firstChar = (opt.text || `${i + 1}`).trim().charAt(0).toUpperCase() || `${i + 1}`;
              const fallbackBg = getOptionColor(opt.id);
              return (
                <div
                  key={opt.id}
                  className={`poll-card ${isError ? 'border-red-200' : ''}`}
                >
                  <div className="poll-card-img-wrapper">
                    {uploadingMap[opt.id] ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    ) : opt.imageUrl ? (
                      <>
                        <img
                          src={opt.imageUrl}
                          className="poll-card-img cursor-pointer"
                          onClick={() => setPreviewImage(opt.imageUrl)}
                        />
                        <button
                          className="poll-preview-btn"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(opt.imageUrl); }}
                          type="button"
                          aria-label={t('common.preview')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>
                        <button
                          className="absolute top-2 left-2 bg-white/90 text-red-600 rounded-md px-2 py-1 text-xs font-bold border border-red-100 hover:bg-white shadow-sm"
                          onClick={(e) => { e.stopPropagation(); removeImage(opt.id); }}
                          type="button"
                        >
                          {t('common.remove')}
                        </button>
                      </>
                    ) : (
                      <div className="poll-card-fallback" style={{ backgroundColor: fallbackBg }}>{firstChar}</div>
                    )}
                  </div>
                  <div className="poll-card-content">
                    <input
                      type="text"
                      className={`lark-input opt-input w-full shadow-sm ${isError ? 'lark-input-error' : ''}`}
                      placeholder={t('common.option_placeholder', { n: i + 1 })}
                      value={opt.text}
                      onChange={(e) => updateOptionText(opt.id, e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        className="lark-btn lark-btn-outline !h-7 !px-3 text-xs bg-white hover:border-blue-200 hover:text-blue-600"
                        onClick={() => triggerImageUpload(opt.id)}
                        type="button"
                      >
                        {opt.imageUrl ? t('common.replace_image') : t('common.upload_image')}
                      </button>
                      {editorDraft.options.length > 2 ? (
                        <button
                          className="lark-btn lark-btn-outline !h-7 !px-3 text-xs bg-white hover:border-red-200 hover:text-red-600"
                          onClick={() => deleteOption(opt.id)}
                          type="button"
                        >
                          {t('common.delete')}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full bg-white p-1">
            {editorDraft.options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2 w-full">
                {uploadingMap[opt.id] && (
                  <div className="relative w-9 h-9 shrink-0 flex items-center justify-center bg-gray-100 rounded">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {!uploadingMap[opt.id] && opt.imageUrl && (
                  <div className="relative w-9 h-9 shrink-0">
                    <img
                      src={opt.imageUrl}
                      className="w-full h-full object-cover rounded shadow-md border border-gray-100 bg-gray-50 cursor-pointer"
                      onClick={() => setPreviewImage(opt.imageUrl)}
                    />
                    <button
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm"
                      onClick={() => removeImage(opt.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  className={`lark-input opt-input flex-1 shadow-sm focus:shadow-md transition-shadow ${editorErrors[`opt_${opt.id}`] ? 'lark-input-error' : ''}`}
                  placeholder={t('common.option_placeholder', { n: i + 1 })}
                  value={opt.text}
                  onChange={(e) => updateOptionText(opt.id, e.target.value)}
                />
                <button
                  className="p-1.5 text-gray-400 hover:text-blue-600 border border-transparent hover:border-blue-100 hover:bg-blue-50 rounded transition-colors shadow-sm bg-gray-50"
                  onClick={() => triggerImageUpload(opt.id)}
                  title={opt.imageUrl ? t('common.replace_image') : t('common.upload_image')}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </button>
                {editorDraft.options.length > 2 && (
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    onClick={() => deleteOption(opt.id)}
                    title={t('common.delete')}
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="lark-btn lark-btn-outline mt-4 shadow-sm text-sm !h-8 bg-gray-50" onClick={addOption}>
          {t('common.add_more_options')}
        </button>
      </div>
    </div>
  );

  const renderWordCloudEditor = () => (
    <div>
      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.word_cloud_theme')}</label>
        <input
          type="text"
          className={`lark-input font-medium ${editorErrors.title ? 'lark-input-error' : ''}`}
          placeholder={t('placeholder.word_cloud_theme')}
          value={editorDraft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
        />
      </div>

      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('label.word_cloud_settings')}</label>
        <div className="flex flex-col gap-4 bg-gray-50 p-3 rounded border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">{t('word_cloud.max_words')}</span>
              <input
                type="number"
                className="lark-input !w-16 !px-1 !text-center shadow-inner text-xs"
                min={5}
                max={100}
                value={editorDraft.wordCloudConfig.maxWords}
                onChange={(e) => updateDraft({
                  wordCloudConfig: { ...editorDraft.wordCloudConfig, maxWords: parseInt(e.target.value) || 30 }
                })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">{t('word_cloud.min_length')}</span>
              <input
                type="number"
                className="lark-input !w-16 !px-1 !text-center shadow-inner text-xs"
                min={1}
                max={5}
                value={editorDraft.wordCloudConfig.minWordLength}
                onChange={(e) => updateDraft({
                  wordCloudConfig: { ...editorDraft.wordCloudConfig, minWordLength: parseInt(e.target.value) || 1 }
                })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              checked={editorDraft.allowAnonymous}
              onChange={(e) => updateDraft({ allowAnonymous: e.target.checked })}
            />
            <span className="text-sm font-medium">{t('common.anonymous_participation')}</span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('label.deadline')} <span className="text-xs text-gray-400 font-normal ml-1">({t('hint.deadline_optional')})</span></label>
        <input
          type="datetime-local"
          className="lark-input w-max text-sm"
          lang={locale}
          value={editorDraft.deadline}
          onChange={(e) => updateDraft({ deadline: e.target.value })}
        />
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">{t('help.how_to_participate')}</p>
            <p className="text-blue-600">{t('help.word_cloud')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQAEditor = () => (
    <div>
      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.qa_theme')}</label>
        <input
          type="text"
          className={`lark-input font-medium ${editorErrors.title ? 'lark-input-error' : ''}`}
          placeholder={t('placeholder.qa_theme')}
          value={editorDraft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
        />
      </div>

      <div className="mb-5">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('section.qa_settings')}</label>
        <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded border border-gray-100 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              checked={editorDraft.qaConfig.allowAnonymous}
              onChange={(e) => updateDraft({
                qaConfig: { ...editorDraft.qaConfig, allowAnonymous: e.target.checked }
              })}
            />
            <span className="text-sm font-medium">{t('common.anonymous_participation')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              checked={editorDraft.qaConfig.allowUpvote}
              onChange={(e) => updateDraft({
                qaConfig: { ...editorDraft.qaConfig, allowUpvote: e.target.checked }
              })}
            />
            <span className="text-sm font-medium">{t('qa.enable_upvote')}</span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-800 text-sm">{t('label.deadline')} <span className="text-xs text-gray-400 font-normal ml-1">({t('hint.deadline_optional')})</span></label>
        <input
          type="datetime-local"
          className="lark-input w-max text-sm"
          lang={locale}
          value={editorDraft.deadline}
          onChange={(e) => updateDraft({ deadline: e.target.value })}
        />
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">{t('help.how_to_participate')}</p>
            <p className="text-blue-600">{t('help.qa')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRankingEditor = () => {
    const cfg = editorDraft.rankingConfig;
    const mode = cfg.mode;

    return (
      <div>
        <div className="mb-5">
          <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.ranking_title')}</label>
          <input
            type="text"
            className={`lark-input font-medium ${editorErrors.title ? 'lark-input-error' : ''}`}
            placeholder={mode === 'ranking' ? t('placeholder.ranking_title') : t('placeholder.rating_title')}
            value={editorDraft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-medium text-gray-800 text-sm">{mode === 'ranking' ? t('section.ranking_settings') : t('section.rating_settings')}</label>
          <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50 transition-colors mb-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              checked={editorDraft.allowAnonymous}
              onChange={(e) => updateDraft({ allowAnonymous: e.target.checked })}
            />
            <span className="text-sm font-medium">{t('common.anonymous_participation')}</span>
          </label>

          {mode === 'scale' && (
            <div className="bg-gray-50 p-3 rounded border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{t('ranking.scale_min')}</span>
                  <input
                    type="number"
                    className="lark-input !w-14 !px-1 !text-center text-xs"
                    min={0}
                    max={10}
                    value={cfg.scaleMin}
                    onChange={(e) => updateDraft({
                      rankingConfig: { ...cfg, scaleMin: parseInt(e.target.value) || 1 }
                    })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{t('ranking.scale_max')}</span>
                  <input
                    type="number"
                    className="lark-input !w-14 !px-1 !text-center text-xs"
                    min={1}
                    max={10}
                    value={cfg.scaleMax}
                    onChange={(e) => updateDraft({
                      rankingConfig: { ...cfg, scaleMax: parseInt(e.target.value) || 5 }
                    })}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p className="mb-1 font-medium">{t('ranking.scale_labels_optional')}</p>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cfg.scaleMax}, 1fr)` }}>
                  {Array.from({ length: cfg.scaleMax }, (_, i) => i + 1).map(s => (
                    <input
                      key={s}
                      type="text"
                      className="lark-input !h-6 !text-[10px] text-center"
                      placeholder={`${s}`}
                      value={cfg.scaleLabels[s] || ''}
                      onChange={(e) => updateDraft({
                        rankingConfig: {
                          ...cfg,
                          scaleLabels: { ...cfg.scaleLabels, [s]: e.target.value }
                        }
                      })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-medium text-gray-800 text-sm"><span className="text-red-500 mr-1">*</span>{t('label.ranking_items')}</label>
          <div className="flex flex-col gap-2">
            {cfg.items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  className={`lark-input flex-1 ${editorErrors[`ranking_${item.id}`] ? 'lark-input-error' : ''}`}
                  placeholder={t('common.option_placeholder', { n: i + 1 })}
                  value={item.text}
                  onChange={(e) => {
                    setEditorErrors(prev => {
                      const key = `ranking_${item.id}`;
                      if (!prev[key]) return prev;
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    const newItems = [...cfg.items];
                    newItems[i] = { ...item, text: e.target.value };
                    updateDraft({ rankingConfig: { ...cfg, items: newItems } });
                  }}
                />
                {cfg.items.length > 2 && (
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    onClick={() => {
                      const newItems = cfg.items.filter(it => it.id !== item.id);
                      updateDraft({ rankingConfig: { ...cfg, items: newItems } });
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="lark-btn lark-btn-outline mt-3 shadow-sm text-sm !h-8 bg-gray-50"
            onClick={() => {
              const newItems = [...cfg.items, { id: `item_${Date.now()}`, text: '' }];
              updateDraft({ rankingConfig: { ...cfg, items: newItems } });
            }}
          >
            {t('common.add_option')}
          </button>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-800 text-sm">{t('label.deadline')} <span className="text-xs text-gray-400 font-normal ml-1">({t('hint.deadline_optional')})</span></label>
          <input
            type="datetime-local"
            className="lark-input w-max text-sm"
            lang={locale}
            value={editorDraft.deadline}
            onChange={(e) => updateDraft({ deadline: e.target.value })}
          />
        </div>
      </div>
    );
  };

  const renderEditorForm = () => {
    switch (editorDraft.type) {
      case 'live_polling':
        return renderPollEditor();
      case 'word_cloud':
        return renderWordCloudEditor();
      case 'qa':
        return renderQAEditor();
      case 'ranking':
        return renderRankingEditor();
      default:
        return null;
    }
  };

  const renderHeaderTags = (typeLabel: string, colorClass: string, isAnonymous?: boolean) => {
    const isEnded = config?.deadline ? new Date() > new Date(config.deadline) : false;
    return (
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={`inline-block px-2.5 py-0.5 ${colorClass} rounded text-xs border shadow-sm`}>
          {typeLabel}
        </span>
        {isAnonymous && (
          <span className="inline-block px-2.5 py-0.5 bg-gray-50 text-gray-600 rounded text-xs border border-gray-200">
            {t('common.anonymous_tag')}
          </span>
        )}
        {config?.deadline && (
          <span className="inline-block px-2.5 py-0.5 bg-gray-50 text-gray-500 rounded text-xs border border-gray-200">
            {t('common.deadline_until', { time: config.deadline.replace('T', ' ') })}
          </span>
        )}
        {isEnded && (
          <span className="inline-block px-2.5 py-0.5 bg-red-50 text-red-500 rounded text-xs border border-red-100 font-medium tracking-wide">
            {t('common.ended')}
          </span>
        )}
      </div>
    );
  };



  const renderPollViewer = () => {
    if (!config) return null;
    return (
      <PollViewer
        config={config}
        results={results}
        userState={userState}
        tempSelectedOptions={tempSelectedOptions}
        handleOptionClick={handleOptionClick}
        submitVote={submitVote}
        setPreviewImage={setPreviewImage}
        renderHeaderTags={renderHeaderTags}
      />
    );
  };

  const renderWordCloudViewer = () => {
    if (!config) return null;
    const isEnded = config.deadline ? new Date() > new Date(config.deadline) : false;
    const wordList = wordListForViewer;

    return (
      <div>
        {renderHeaderTags(t('tab.word_cloud'), 'bg-purple-50 text-purple-600 border-purple-100', Boolean((config as any)?.allowAnonymous))}

        <div className="word-cloud-container min-h-[200px] bg-gray-50 rounded-xl border border-gray-100 p-8 flex flex-wrap justify-center items-center content-center gap-4 mb-8">
          {wordList.length > 0 ? (
            wordList.map((item, index) => {
              const size = Math.min(Math.max(item.count * 4 + 14, 14), 48);
              const color = COLORS[index % COLORS.length];
              return (
                <span
                  key={item.text}
                  className="word-cloud-item inline-block transition-all duration-300 hover:text-blue-600 cursor-default"
                  style={{ fontSize: `${size}px`, color: color }}
                >
                  {item.text}
                </span>
              );
            })
          ) : (
            <div className="text-gray-400 text-sm">{t('word_cloud.waiting')}</div>
          )}
        </div>

        {!userState.hasParticipated && !isEnded && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 sticky bottom-4 z-20">
            <div className="flex gap-2">
              <input
                type="text"
                className="lark-input flex-1"
                placeholder={t('word_cloud.input_placeholder')}
                value={wordCloudInput}
                onChange={(e) => setWordCloudInput(e.target.value)}
                onFocus={() => setIsUserTyping(true)}
                onBlur={() => setIsUserTyping(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submitWord();
                  }
                }}
              />
              <button className="lark-btn lark-btn-primary !px-6" onClick={submitWord}>
                {t('common.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQASViewer = () => {
    if (!config) return null;
    const isEnded = config.deadline ? new Date() > new Date(config.deadline) : false;
    const isAnonymous = Boolean(config.qaConfig.allowAnonymous);
    const sortedQuestions = sortedQuestionsForViewer;
    const participants = Array.isArray(results?.participants) ? results.participants : [];

    return (
      <div>
        {renderHeaderTags(t('tab.qa'), 'bg-green-50 text-green-600 border-green-100', Boolean(config?.qaConfig?.allowAnonymous))}

        <div className="flex flex-col gap-4 mb-8">
          {sortedQuestions.length > 0 ? sortedQuestions.map((q: Question) => (
            <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                          <LikeBurstButton
                            active={userState.upvotedQuestions?.includes(q.id)}
                            disabled={!config.qaConfig.allowUpvote}
                            onClick={() => upvoteQuestion(q.id)}
                            ariaLabel={t('qa.like')}
                          />
                  <span className="text-xs font-bold text-gray-500">{q.upvotes || 0}</span>
                </div>
                <div className="flex-1">
                  <div className="text-gray-800 font-medium mb-1">{q.text}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {config.qaConfig.showAuthor && (
                      <div className="flex items-center gap-1">
                        {!isAnonymous && q.author ? (
                          <UserAvatar
                            id={q.authorId || ''}
                            name={q.author || ''}
                            avatar={
                              q.authorAvatar ||
                              (q.authorId
                                ? (participants.find((p: any) => (typeof p !== 'string' && p?.id === q.authorId))?.avatar ||
                                  participants.find((p: any) => (typeof p !== 'string' && p?.id === q.authorId))?.avatarUrl ||
                                  participants.find((p: any) => (typeof p !== 'string' && p?.id === q.authorId))?.avatar_url ||
                                  '')
                                : ((participants.find((p: any) => (typeof p !== 'string' && p?.name && p.name === q.author))?.avatar ||
                                  participants.find((p: any) => (typeof p !== 'string' && p?.name && p.name === q.author))?.avatarUrl ||
                                  participants.find((p: any) => (typeof p !== 'string' && p?.name && p.name === q.author))?.avatar_url ||
                                  '') || (q.author === currentUser?.name ? currentUser.avatar : '')))
                            }
                            sizeClassName="w-5 h-5"
                          />
                        ) : null}
                        <span>{isAnonymous ? t('common.anonymous_user') : (q.author || t('common.anonymous_user'))}</span>
                      </div>
                    )}
                    <span>•</span>
                    <span>{new Date(q.timestamp).toLocaleTimeString(locale)}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
              {t('qa.empty')}
            </div>
          )}
        </div>

        {!userState.hasParticipated && !isEnded && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 sticky bottom-4 z-20">
            <div className="flex flex-col gap-2">
              <textarea
                className="lark-input !h-20 resize-none"
                placeholder={t('qa.input_placeholder')}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onFocus={() => setIsUserTyping(true)}
                onBlur={() => setIsUserTyping(false)}
              />
              <div className="flex justify-end">
                <button className="lark-btn lark-btn-primary" onClick={submitQuestion}>
                  {t('qa.submit_question')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRankingViewer = () => {
    if (!config) return null;
    return (
      <RankingViewer
        config={config}
        results={results}
        userState={userState}
        renderHeaderTags={renderHeaderTags}
        renderInput={() => (
          <RankingInput
            mode={config.rankingConfig.mode}
            items={config.rankingConfig.items}
            cfg={config.rankingConfig}
            allowAnonymous={Boolean((config as any).allowAnonymous)}
            userState={userState}
            setUserState={setUserState}
            setIsSelectingScore={setIsSelectingScore}
            activeQuestionId={activeQuestionId}
            showToast={showToast}
            fetchDataAndRender={fetchDataAndRender}
            runWithBusy={runWithBusy}
          />
        )}
      />
    );
  };

  const renderViewer = () => {
    if (!config) return null;
    switch (config.type) {
      case 'live_polling':
        return renderPollViewer();
      case 'word_cloud':
        return renderWordCloudViewer();
      case 'qa':
        return renderQASViewer();
      case 'ranking':
        return renderRankingViewer();
      default:
        return <div>{t('common.unknown_type')}</div>;
    }
  };

  const qId = activeQuestionId || '';
  const qIdParts = qId.split('_');
  const shortId = qIdParts[0] || qId;
  const createTs = qIdParts[1] ? Number(qIdParts[1]) : NaN;
  const createTimeStr = Number.isFinite(createTs)
    ? new Date(createTs).toLocaleString(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
  const participationAnonymous = config?.type === 'qa'
    ? Boolean(config?.qaConfig?.allowAnonymous)
    : Boolean((config as any)?.allowAnonymous);
  const participantsRaw = Array.isArray(results?.participants) ? results.participants : [];
  const participantsForFooter = (() => {
    const isQA = config?.type === 'qa';
    const qs = isQA && Array.isArray((results as any)?.questions) ? (results as any).questions : [];
    const byId = new Map<string, string>();
    const byName = new Map<string, string>();
    qs.forEach((q: any) => {
      const a = q?.authorAvatar || '';
      const id = q?.authorId ? String(q.authorId) : '';
      const name = q?.author ? String(q.author) : '';
      if (a && id && !byId.has(id)) byId.set(id, a);
      if (a && name && !byName.has(name)) byName.set(name, a);
    });

    const normalized = participantsRaw.map((p: any) => (typeof p === 'string' ? { id: p } : p));
    const merged = normalized.map((p: any) => {
      const id = p?.id ? String(p.id) : '';
      const name = p?.name ? String(p.name) : '';
      const avatar = p?.avatar || p?.avatarUrl || p?.avatar_url || byId.get(id) || byName.get(name) || (name && name === currentUser?.name ? currentUser.avatar : '') || '';
      return { ...p, id, name, avatar };
    });

    if (merged.length > 0) return merged;
    if (!isQA) return [];
    const seen = new Set<string>();
    const derived: any[] = [];
    qs.forEach((q: any) => {
      if (!q?.author) return;
      const id = q?.authorId ? String(q.authorId) : String(q.author);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const name = q?.author ? String(q.author) : '';
      const avatar = q?.authorAvatar || byId.get(id) || byName.get(name) || (name && name === currentUser?.name ? currentUser.avatar : '') || '';
      derived.push({ id, name, avatar });
    });
    return derived;
  })();

  const wordListForViewer = React.useMemo(() => {
    const words = results?.words || {};
    const maxWords = config?.wordCloudConfig?.maxWords;
    if (!maxWords) return [];
    return Object.entries(words)
      .map(([text, count]) => ({ text, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxWords);
  }, [results?.words, config?.wordCloudConfig?.maxWords]);

  const sortedQuestionsForViewer = React.useMemo(() => {
    const questions = results?.questions || [];
    return [...questions].sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
  }, [results?.questions]);

  const editorActiveTabKey =
    editorDraft.type === 'ranking'
      ? (editorDraft.rankingConfig.mode === 'scale' ? 'ranking_scale' : 'ranking_sort')
      : editorDraft.type;

  if (mode === 'loading') {
    return (
      <div className="flex justify-center w-full text-gray-800">
        <div ref={appRef} className="w-full max-w-3xl ui-surface">
          <div className="ui-loading">
            <div className="ui-spinner" />
            <div className="ui-loading-text">{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full text-gray-800">
      <div ref={appRef} className="w-full max-w-3xl bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
        {mode === 'editor' && (
          <div className="flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-medium text-base text-gray-900">
              {t('editor.title')}
            </div>
            <div className="p-6 w-full">
              <div className="flex gap-2 border-b border-gray-200 mb-6">
                {[
                  {
                    key: 'live_polling',
                    label: t('tab.live_polling'),
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18M7 15V9m4 6V5m4 10v-4" />
                      </svg>
                    )
                  },
                  {
                    key: 'word_cloud',
                    label: t('tab.word_cloud'),
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 014-4h.4A5.5 5.5 0 0118.5 13H19a3 3 0 010 6H7a4 4 0 01-4-4z" />
                      </svg>
                    )
                  },
                  {
                    key: 'qa',
                    label: t('tab.qa'),
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h6m-8 8l4-4h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )
                  },
                  {
                    key: 'ranking_sort',
                    label: t('tab.ranking_sort'),
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 20h16" />
                        <rect x="5" y="12" width="4" height="8" rx="1" strokeWidth="2" />
                        <rect x="10" y="8" width="4" height="12" rx="1" strokeWidth="2" />
                        <rect x="15" y="14" width="4" height="6" rx="1" strokeWidth="2" />
                      </svg>
                    )
                  },
                  {
                    key: 'ranking_scale',
                    label: t('tab.ranking_scale'),
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.48 3.499a.562.562 0 011.04 0l2.06 5.136a.563.563 0 00.475.35l5.53.442a.562.562 0 01.32.99l-4.21 3.61a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.73-2.89a.562.562 0 00-.586 0l-4.73 2.89a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.21-3.61a.562.562 0 01.32-.99l5.53-.442a.563.563 0 00.475-.35l2.06-5.136z" />
                      </svg>
                    )
                  }
                ].map(tab => (
                  <div
                    key={tab.key}
                    className={`px-4 py-2 cursor-pointer editor-tab flex items-center gap-1.5 ${editorActiveTabKey === tab.key ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500 border-b-2 border-transparent'}`}
                    onClick={() => handleTabClick(tab.key)}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                ))}
              </div>
              {renderEditorForm()}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
              {editorStatus.message ? (
                <span className={`text-xs flex items-center gap-1.5 ${editorStatus.type === 'error' ? 'text-red-600' : editorStatus.type === 'success' ? 'text-green-600' : 'text-gray-500'}`}>
                  {renderStatusIcon(editorStatus.type, `w-4 h-4 ${editorStatus.type === 'error' ? 'text-red-500' : editorStatus.type === 'success' ? 'text-green-600' : 'text-gray-400'}`)}
                  <span className="font-medium">{editorStatus.message}</span>
                </span>
              ) : (
                <span />
              )}
              <button
                className="lark-btn lark-btn-primary shadow-sm !px-8 !h-10 text-base font-bold"
                onClick={saveAndPublish}
              >
                {t('editor.save_publish')}
              </button>
            </div>
          </div>
        )}

        {mode === 'viewer' && (
          <div className="flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">{t('viewer.ongoing')}</span>
              <button
                className="lark-btn lark-btn-outline !h-6 !text-xs !px-2 bg-white"
                onClick={async () => {
                  const qId = await StoreService.getQuestionId();
                  await fetchDataAndRender(qId);
                }}
              >
                {t('viewer.refresh')}
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-xl font-bold text-gray-900 leading-tight">{config?.title || t('viewer.untitled')}</div>
                <div className="text-[10px] text-gray-400 text-right shrink-0 ml-3 mt-1 leading-tight">
                  <div>ID: {shortId}</div>
                  {createTimeStr ? <div>{t('viewer.created_at', { time: createTimeStr })}</div> : null}
                  {createdBy?.name ? <div>{t('viewer.created_by', { name: createdBy.name })}</div> : null}
                </div>
              </div>
              {renderViewer()}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('viewer.participants_label')} <span className="font-medium">{results?.participantCount || 0}</span> {t('viewer.people_unit')}
              </span>
              {!participationAnonymous && participantsForFooter.length > 0 ? (
                <AvatarStack participants={participantsForFooter} />
              ) : (
                <span />
              )}
            </div>
          </div>
        )}

        <input
        type="file"
        id="image-upload-input"
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
        />

        {busy.show && (
          <div className="ui-busy-overlay">
            <div className="ui-busy-card">
              <div className="ui-spinner" />
              <div className="ui-busy-text">{busy.message || t('common.processing')}</div>
            </div>
          </div>
        )}

        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}
          >
            <img src={previewImage} className="max-w-full max-h-full object-contain rounded shadow-2xl" />
          </div>
        )}

        {toast.show && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`pointer-events-none bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'error' ? 'text-red-700 border border-red-200' : toast.type === 'success' ? 'text-green-700 border border-green-200' : 'text-gray-800 border border-gray-200'}`}>
              {renderStatusIcon(toast.type, `w-5 h-5 ${toast.type === 'error' ? 'text-red-500' : toast.type === 'success' ? 'text-green-600' : 'text-gray-500'}`)}
              <div className="text-sm font-medium">{toast.message}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

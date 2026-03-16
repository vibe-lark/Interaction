import React from 'react';
import { useI18n } from '../../i18n';

export const RankingViewer: React.FC<{
  config: any;
  results: any;
  userState: any;
  renderHeaderTags: (label: string, color: string, isAnonymous?: boolean) => JSX.Element;
  renderInput: () => JSX.Element | null;
}> = ({ config, results, userState, renderHeaderTags, renderInput }) => {
  const { t } = useI18n();
  const isEnded = config?.deadline ? new Date() > new Date(config.deadline) : false;
  const hasVoted = Boolean(userState?.hasParticipated);
  const responses = results?.responses || [];
  const myAnswers = userState?.rankingAnswers;
  const mode = config?.rankingConfig?.mode;
  const items = config?.rankingConfig?.items || [];
  const scaleMax = config?.rankingConfig?.scaleMax || 5;

  const stats = React.useMemo(() => {
    if (mode === 'ranking') {
      const rankCounts: Record<string, Record<number, number>> = {};
      items.forEach((item: any) => {
        rankCounts[item.id] = {};
        for (let i = 1; i <= items.length; i++) {
          rankCounts[item.id][i] = 0;
        }
      });

      responses.forEach((res: any) => {
        if (Array.isArray(res.answers)) {
          res.answers.forEach((rank: number, index: number) => {
            const itemId = items?.[index]?.id;
            if (itemId && rankCounts[itemId]) {
              rankCounts[itemId][rank] = (rankCounts[itemId][rank] || 0) + 1;
            }
          });
        }
      });
      return rankCounts;
    }

    const scaleStats: Record<string, { totalScore: number; count: number; avg: number }> = {};
    items.forEach((item: any) => {
      scaleStats[item.id] = { totalScore: 0, count: 0, avg: 0 };
    });

    responses.forEach((res: any) => {
      if (res.answers && typeof res.answers === 'object') {
        Object.entries(res.answers).forEach(([itemId, score]) => {
          if (scaleStats[itemId] && typeof score === 'number') {
            scaleStats[itemId].totalScore += score;
            scaleStats[itemId].count += 1;
          }
        });
      }
    });

    Object.keys(scaleStats).forEach(key => {
      if (scaleStats[key].count > 0) {
        scaleStats[key].avg = Number((scaleStats[key].totalScore / scaleStats[key].count).toFixed(1));
      }
    });
    return scaleStats;
  }, [mode, items, responses]);

  return (
    <div>
      {renderHeaderTags(mode === 'ranking' ? t('ranking.viewer.tag_ranking') : t('ranking.viewer.tag_rating'), 'bg-orange-50 text-orange-600 border-orange-100', Boolean(config?.allowAnonymous))}
      
      {(hasVoted || isEnded) ? (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">{t('ranking.viewer.stats')}</div>
            
            {mode === 'ranking' ? (
              <div className="space-y-4">
                {items.map((item: any) => (
                  <div key={item.id}>
                    <div className="text-sm font-medium text-gray-700 mb-2">{item.text}</div>
                    <div className="flex gap-1 h-24 items-end">
                      {Array.from({ length: items.length }, (_, i) => i + 1).map(rank => {
                        const count = (stats as any)[item.id]?.[rank] || 0;
                        const total = responses.length || 1;
                        const heightPercent = total > 0 ? (count / total) * 100 : 0;
                        const height = count > 0 ? Math.max(heightPercent, 10) : 0;
                        
                        return (
                          <div key={rank} className="flex-1 flex flex-col items-center h-full group">
                            <div className="text-[10px] text-center text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity h-4 flex items-end pb-0.5">{t('poll.vote_count', { count })}</div>
                            <div className="w-full flex-1 flex items-end bg-gray-50 rounded-t">
                              <div 
                                className="w-full bg-blue-100 rounded-t hover:bg-blue-200 transition-colors relative"
                                style={{ height: `${height}%` }}
                              >
                              </div>
                            </div>
                            <div className="text-[10px] text-center text-gray-500 border-t border-gray-200 pt-1 w-full h-5">{t('ranking.viewer.rank_label', { rank })}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item: any) => {
                  const itemStat = (stats as any)[item.id];
                  const percent = scaleMax ? (itemStat.avg / scaleMax) * 100 : 0;
                  
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.text}</span>
                        <span className="text-sm font-bold text-blue-600">{t('ranking.viewer.points', { score: itemStat.avg })}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {myAnswers ? (
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">{t('ranking.viewer.my_submission')}</div>
              {config?.rankingConfig?.mode === 'ranking' && Array.isArray(myAnswers) ? (
                <div className="space-y-2">
                  {(config?.rankingConfig?.items || [])
                    .map((item: any, idx: number) => ({ ...item, rank: myAnswers[idx] }))
                    .filter((it: any) => typeof it.rank === 'number')
                    .sort((a: any, b: any) => a.rank - b.rank)
                    .map((it: any) => (
                      <div key={it.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center border border-blue-100">
                          {it.rank}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">{it.text}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(config?.rankingConfig?.items || []).map((item: any) => {
                    const score = myAnswers?.[item.id];
                    const label = config?.rankingConfig?.scaleLabels?.[score];
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-700 font-medium flex-1">{item.text}</div>
                        <div className="text-sm font-bold text-blue-600 shrink-0">
                          {typeof score === 'number' ? t('ranking.viewer.points', { score }) : '-'}
                        </div>
                        {label ? <div className="text-xs text-gray-400 shrink-0">{label}</div> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          
          {!isEnded && (
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                {t('ranking.viewer.participated')}
              </span>
            </div>
          )}
        </div>
      ) : (
        renderInput()
      )}
    </div>
  );
};

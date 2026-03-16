import React from 'react';
import { DocMiniApp } from './services/store';

export type SupportedLanguage =
  | 'zh-CN'
  | 'zh-TW'
  | 'zh-HK'
  | 'en-US'
  | 'ja-JP'
  | 'fr-FR'
  | 'hi-IN'
  | 'id-ID'
  | 'it-IT'
  | 'ko-KR'
  | 'pt-BR'
  | 'ru-RU'
  | 'th-TH'
  | 'vi-VN'
  | 'de-DE'
  | 'es-ES';

type Dict = Record<string, string>;
type Params = Record<string, string | number>;

const ZH_CN: Dict = {
  'avatar.more_people': '还有 {count} 人',

  'common.add_more_options': '+ 增加更多选项',
  'common.add_option': '+ 添加选项',
  'common.anonymous_participation': '匿名参与',
  'common.anonymous_tag': '匿名',
  'common.anonymous_user': '匿名用户',
  'common.check': '检查',
  'common.confirm': '确认',
  'common.deadline_until': '截止至 {time}',
  'common.delete': '删除',
  'common.ended': '已结束',
  'common.option_placeholder': '选项 {n}',
  'common.preview': '预览',
  'common.loading': '加载中...',
  'common.processing': '处理中...',
  'common.remove': '移除',
  'common.replace_image': '更换图片',
  'common.submit': '提交',
  'common.submit_success': '提交成功！',
  'common.submitting': '提交中...',
  'common.unknown_type': '未知类型',
  'common.upload_image': '上传图片',
  'common.upload_success': '上传成功！',
  'common.view_image': '查看大图',

  'editor.title': '创建互动',
  'editor.save_publish': '保存并发布',

  'error.all_items_required': '请填写所有选项内容',
  'error.check_required_fields': '请检查必填项',
  'error.image_upload_failed': '图片上传失败，请重试',
  'error.image_uploading': '图片正在上传中，请稍候再发布',
  'error.poll_option_required': '选项至少需要文字或图片',
  'error.poll_theme_required': '请输入投票主题',
  'error.qa_theme_required': '请输入讨论主题',
  'error.ranking_min_items': '请至少添加 {min} 个选项',
  'error.ranking_title_required': '请输入主题',
  'error.word_cloud_theme_required': '请输入灵感词云主题',

  'help.how_to_participate': '同学如何参与？',
  'help.qa': '发布后，同学可以提交问题，其他人可以点赞支持。问题按点赞数从高到低排序。',
  'help.word_cloud': '发布后，同学可以输入多个关键词提交。关键词出现频率越高，字体越大。',

  'hint.deadline_optional': '不选则长期有效',

  'label.deadline': '截止时间',
  'label.poll_options': '投票选项',
  'label.poll_theme': '投票主题',
  'label.qa_theme': '讨论主题',
  'label.ranking_items': '选项列表',
  'label.ranking_title': '主题',
  'label.word_cloud_settings': '灵感词云设置',
  'label.word_cloud_theme': '灵感词云主题',

  'placeholder.poll_theme': '例如：关于下个季度的项目规划，大家倾向于哪个方向？',
  'placeholder.qa_theme': '例如：关于本次全员会，大家有什么疑问或建议？',
  'placeholder.rating_title': '例如：请对本次培训的内容质量进行评分',
  'placeholder.ranking_title': '例如：请对以下功能需求的重要性进行排名',
  'placeholder.word_cloud_theme': '例如：用一个词形容我们团队的核心价值观',

  'poll.allow_multiple': '允许多选（可选择多个选项）',
  'poll.confirm_vote': '确认投票',
  'poll.ended': '该投票已结束！',
  'poll.layout_card': '卡片',
  'poll.layout_list': '列表',
  'poll.max_select': '最多选择',
  'poll.max_select_error': '最多只能选择 {max} 项',
  'poll.min_select': '最少选择',
  'poll.min_select_error': '请至少选择 {min} 项',
  'poll.multi_tag': '多选（可选 {min}-{max} 项）',
  'poll.option_fallback': '选项',
  'poll.option_layout': '选项布局:',
  'poll.results_after_submit': '提交后可见结果',
  'poll.results_summary': '结果汇总',
  'poll.select_one': '请先选择一个选项',
  'poll.single_tag': '单选',
  'poll.unnamed_option': '未命名选项',
  'poll.vote_count': '{count} 票',

  'qa.already_liked': '您已经点赞过这个问题了',
  'qa.empty': '暂时还没有问题，快来提问吧！',
  'qa.enable_upvote': '启用点赞功能',
  'qa.input_placeholder': '请输入你的问题...',
  'qa.like': '点赞',
  'qa.question_required': '请输入问题内容',
  'qa.question_submit_success': '问题提交成功！',
  'qa.submit_question': '提交问题',

  'ranking.move_down': '下移',
  'ranking.move_up': '上移',
  'ranking.rank_hint': '点击上下按钮调整排名，最重要的排最前面',
  'ranking.ranking_submit_success': '排名提交成功！',
  'ranking.scale_incomplete_error': '请完成所有项目的评分',
  'ranking.scale_label.1': '非常不同意',
  'ranking.scale_label.2': '不同意',
  'ranking.scale_label.3': '一般',
  'ranking.scale_label.4': '同意',
  'ranking.scale_label.5': '非常同意',
  'ranking.scale_labels_optional': '评分说明（可编辑）:',
  'ranking.scale_max': '最高分:',
  'ranking.scale_min': '最低分:',
  'ranking.scale_submit_success': '评分提交成功！',
  'ranking.submit_ranking': '提交排名',
  'ranking.submit_rating': '提交评分',
  'ranking.viewer.my_submission': '我的提交',
  'ranking.viewer.participated': '你已完成参与',
  'ranking.viewer.points': '{score} 分',
  'ranking.viewer.rank_label': '第{rank}',
  'ranking.viewer.stats': '结果统计',
  'ranking.viewer.tag_ranking': '排名题',
  'ranking.viewer.tag_rating': '评分题',

  'section.advanced_settings': '高级设置',
  'section.qa_settings': '讨论设置',
  'section.ranking_settings': '排名设置',
  'section.rating_settings': '评分设置',

  'status.published': '已发布',

  'tab.live_polling': '实时投票',
  'tab.word_cloud': '灵感词云',
  'tab.qa': '讨论',
  'tab.ranking_sort': '排名',
  'tab.ranking_scale': '评分',
  'viewer.ongoing': '进行中',
  'viewer.refresh': '刷新结果',
  'viewer.created_at': '创建时间: {time}',
  'viewer.created_by': '创建人: {name}',
  'viewer.participants_label': '参与人数：',
  'viewer.people_unit': '人',
  'viewer.untitled': '无标题互动',

  'toast.publish_success': '发布成功！',

  'word_cloud.duplicate_word': '这个词已经提交过了',
  'word_cloud.input_placeholder': '输入一个关键词 (Enter 提交)',
  'word_cloud.max_words': '最多显示词数:',
  'word_cloud.min_length': '最小词长:',
  'word_cloud.waiting': '等待用户提交词汇...'
};

const EN_US: Dict = {
  'avatar.more_people': '{count} more',

  'common.add_more_options': '+ Add more options',
  'common.add_option': '+ Add item',
  'common.anonymous_participation': 'Anonymous participation',
  'common.anonymous_tag': 'Anonymous',
  'common.anonymous_user': 'Anonymous',
  'common.check': 'Check',
  'common.confirm': 'Confirm',
  'common.deadline_until': 'Until {time}',
  'common.delete': 'Delete',
  'common.ended': 'Ended',
  'common.option_placeholder': 'Option {n}',
  'common.preview': 'Preview',
  'common.loading': 'Loading...',
  'common.processing': 'Processing...',
  'common.remove': 'Remove',
  'common.replace_image': 'Replace image',
  'common.submit': 'Submit',
  'common.submit_success': 'Submitted!',
  'common.submitting': 'Submitting...',
  'common.unknown_type': 'Unknown type',
  'common.upload_image': 'Upload image',
  'common.upload_success': 'Uploaded.',
  'common.view_image': 'View image',

  'editor.title': 'Create Interaction',
  'editor.save_publish': 'Save & Publish',

  'error.all_items_required': 'Please fill in all items',
  'error.check_required_fields': 'Please check required fields',
  'error.image_upload_failed': 'Image upload failed. Please try again.',
  'error.image_uploading': 'Image is uploading. Please publish later.',
  'error.poll_option_required': 'Each option needs text or an image',
  'error.poll_theme_required': 'Please enter the poll title',
  'error.qa_theme_required': 'Please enter the discussion topic',
  'error.ranking_min_items': 'Please add at least {min} items',
  'error.ranking_title_required': 'Please enter the title',
  'error.word_cloud_theme_required': 'Please enter the word cloud title',

  'help.how_to_participate': 'How to participate?',
  'help.qa': 'After publishing, participants can post questions and like others. Questions are sorted by likes.',
  'help.word_cloud': 'After publishing, participants submit keywords. More frequent words appear larger.',

  'hint.deadline_optional': 'Optional',

  'label.deadline': 'Deadline',
  'label.poll_options': 'Options',
  'label.poll_theme': 'Poll Title',
  'label.qa_theme': 'Discussion Topic',
  'label.ranking_items': 'Items',
  'label.ranking_title': 'Title',
  'label.word_cloud_settings': 'Word Cloud Settings',
  'label.word_cloud_theme': 'Word Cloud Title',

  'placeholder.poll_theme': 'e.g. Which direction should we prioritize next quarter?',
  'placeholder.qa_theme': 'e.g. Any questions or suggestions for this meeting?',
  'placeholder.rating_title': 'e.g. Rate the quality of this training',
  'placeholder.ranking_title': 'e.g. Rank the importance of the following items',
  'placeholder.word_cloud_theme': 'e.g. Describe our team in one word',

  'poll.allow_multiple': 'Allow multiple selection',
  'poll.confirm_vote': 'Vote',
  'poll.ended': 'This poll has ended.',
  'poll.layout_card': 'Cards',
  'poll.layout_list': 'List',
  'poll.max_select': 'Max',
  'poll.max_select_error': 'Select up to {max}',
  'poll.min_select': 'Min',
  'poll.min_select_error': 'Select at least {min}',
  'poll.multi_tag': 'Multi ({min}-{max})',
  'poll.option_fallback': 'Option',
  'poll.option_layout': 'Layout:',
  'poll.results_after_submit': 'Results after submit',
  'poll.results_summary': 'Results',
  'poll.select_one': 'Please select an option',
  'poll.single_tag': 'Single',
  'poll.unnamed_option': 'Untitled option',
  'poll.vote_count': '{count} votes',

  'qa.already_liked': 'You already liked this.',
  'qa.empty': 'No questions yet. Ask one!',
  'qa.enable_upvote': 'Enable likes',
  'qa.input_placeholder': 'Type your question...',
  'qa.like': 'Like',
  'qa.question_required': 'Please enter your question',
  'qa.question_submit_success': 'Question submitted!',
  'qa.submit_question': 'Submit',

  'ranking.move_down': 'Move down',
  'ranking.move_up': 'Move up',
  'ranking.rank_hint': 'Use the arrows to reorder. Put the most important at the top.',
  'ranking.ranking_submit_success': 'Ranking submitted!',
  'ranking.scale_incomplete_error': 'Please rate all items',
  'ranking.scale_label.1': 'Strongly disagree',
  'ranking.scale_label.2': 'Disagree',
  'ranking.scale_label.3': 'Neutral',
  'ranking.scale_label.4': 'Agree',
  'ranking.scale_label.5': 'Strongly agree',
  'ranking.scale_labels_optional': 'Labels (editable):',
  'ranking.scale_max': 'Max:',
  'ranking.scale_min': 'Min:',
  'ranking.scale_submit_success': 'Rating submitted!',
  'ranking.submit_ranking': 'Submit ranking',
  'ranking.submit_rating': 'Submit rating',
  'ranking.viewer.my_submission': 'My submission',
  'ranking.viewer.participated': 'You have participated',
  'ranking.viewer.points': '{score} pts',
  'ranking.viewer.rank_label': '#{rank}',
  'ranking.viewer.stats': 'Statistics',
  'ranking.viewer.tag_ranking': 'Ranking',
  'ranking.viewer.tag_rating': 'Rating',

  'section.advanced_settings': 'Advanced settings',
  'section.qa_settings': 'Settings',
  'section.ranking_settings': 'Ranking settings',
  'section.rating_settings': 'Rating settings',

  'status.published': 'Published',

  'tab.live_polling': 'Live Poll',
  'tab.word_cloud': 'Word Cloud',
  'tab.qa': 'Q&A',
  'tab.ranking_sort': 'Ranking',
  'tab.ranking_scale': 'Rating',
  'viewer.ongoing': 'Ongoing',
  'viewer.refresh': 'Refresh',
  'viewer.created_at': 'Created: {time}',
  'viewer.created_by': 'Creator: {name}',
  'viewer.participants_label': 'Participants:',
  'viewer.people_unit': 'people',
  'viewer.untitled': 'Untitled',

  'toast.publish_success': 'Published!',

  'word_cloud.duplicate_word': 'You already submitted this word.',
  'word_cloud.input_placeholder': 'Enter a keyword (Enter to submit)',
  'word_cloud.max_words': 'Max words:',
  'word_cloud.min_length': 'Min length:',
  'word_cloud.waiting': 'Waiting for submissions...'
};

const dictionaries: Record<'zh-CN' | 'en-US', Dict> = {
  'zh-CN': ZH_CN,
  'en-US': EN_US
};

const normalizeLanguage = (raw: unknown): 'zh-CN' | 'en-US' => {
  const s = typeof raw === 'string' ? raw : '';
  if (s === 'zh-CN' || s === 'zh-TW' || s === 'zh-HK' || s.startsWith('zh-')) return 'zh-CN';
  return 'en-US';
};

type I18nValue = {
  language: 'zh-CN' | 'en-US';
  locale: string;
  t: (key: string, params?: Params) => string;
};

const I18nContext = React.createContext<I18nValue>({
  language: 'zh-CN',
  locale: 'zh-CN',
  t: (key) => dictionaries['zh-CN'][key] || key
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = React.useState<'zh-CN' | 'en-US'>('zh-CN');

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await (DocMiniApp as any)?.Env?.Language?.getLanguage?.();
        setLanguage(normalizeLanguage(raw));
      } catch (e) {}
    })();
  }, []);

  React.useEffect(() => {
    const locale = language === 'zh-CN' ? 'zh-CN' : 'en-US';
    document.documentElement.lang = locale;
  }, [language]);

  const format = React.useCallback((template: string, params?: Params) => {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = params[k];
      return v === undefined || v === null ? `{${k}}` : String(v);
    });
  }, []);

  const value = React.useMemo<I18nValue>(() => {
    const dict = dictionaries[language] || dictionaries['zh-CN'];
    const locale = language === 'zh-CN' ? 'zh-CN' : 'en-US';
    return {
      language,
      locale,
      t: (key: string, params?: Params) => format(dict[key] || dictionaries['zh-CN'][key] || key, params)
    };
  }, [format, language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => React.useContext(I18nContext);

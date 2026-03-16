import React from 'react';
import { useI18n } from '../i18n';

export const AvatarStack: React.FC<{
  participants: any[];
  max?: number;
  sizeClassName?: string;
}> = ({ participants, max = 8, sizeClassName = 'w-7 h-7' }) => {
  const { t } = useI18n();
  if (!participants || participants.length === 0) return null;
  const list = participants.slice(0, max);
  return (
    <div className="flex items-center justify-end -space-x-2">
      {list.map((p: any, idx: number) => {
        const id = typeof p === 'string' ? p : (p?.id || '');
        const name = typeof p === 'string' ? '' : (p?.name || '');
        const avatar = typeof p === 'string' ? '' : (p?.avatar || p?.avatarUrl || p?.avatar_url || '');
        const label = name ? name.charAt(0) : (id ? id.charAt(0) : '?');
        const title = name || id || '';
        return (
          <div key={`${id || 'p'}_${idx}`} className={`relative ${sizeClassName} group`} title={title}>
            <div className="w-full h-full rounded-full border border-white bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
              {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : label}
            </div>
            {title ? (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {title}
              </div>
            ) : null}
          </div>
        );
      })}
      {participants.length > max ? (
        <div className={`relative ${sizeClassName} rounded-full border border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm`} title={t('avatar.more_people', { count: participants.length - max })}>
          +{participants.length - max}
        </div>
      ) : null}
    </div>
  );
};

export const UserAvatar: React.FC<{
  id?: string;
  name?: string;
  avatar?: string;
  sizeClassName?: string;
}> = ({ id = '', name = '', avatar = '', sizeClassName = 'w-5 h-5' }) => {
  const label = name ? name.charAt(0) : (id ? id.charAt(0) : '?');
  const title = name || id || '';
  return (
    <div className={`relative ${sizeClassName} group shrink-0`} title={title}>
      <div className="w-full h-full rounded-full border border-white bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
        {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : label}
      </div>
      {title ? (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          {title}
        </div>
      ) : null}
    </div>
  );
};

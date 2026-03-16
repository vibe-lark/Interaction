let cachedUserId: string | null = null;
let cachedUserName: string | null = null;
let cachedUserAvatar: string | null = null;

export const setCachedUser = (user: { id?: string | null; name?: string | null; avatar?: string | null }) => {
  if (user.id) cachedUserId = user.id;
  if (user.name) cachedUserName = user.name;
  if (user.avatar) cachedUserAvatar = user.avatar;
};

export const getCurrentUserName = () => {
  return cachedUserName ?? window.lark?.user?.name ?? window.magic?.user?.name ?? '';
};

export const getCurrentUserId = () => {
  return cachedUserId ?? window.lark?.user?.open_id ?? window.magic?.user?.open_id ?? 'anonymous';
};

export const getCurrentUserAvatar = () => {
  return cachedUserAvatar ?? window.lark?.user?.avatar_url ?? window.magic?.user?.avatar_url ?? '';
};

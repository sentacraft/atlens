export const lensImageStyle = {
  objectPosition: "center",
} as const;

export const getLensImageUrl = (id: string, alternateId?: string) =>
  `/lenses/${id}${alternateId ? `/${alternateId}` : ""}.webp`;

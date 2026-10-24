// Faces shared by the Avatars page, a flow's Avatar tab and /api/faces.

/** Face ids a flow points at: its looks and its smooth changes. */
export function faceIdsOf(faces: unknown): string[] {
  const f = (faces ?? {}) as { expressions?: { uuid?: string }[]; transitions?: { uuid?: string }[] }
  return [...(f.expressions ?? []), ...(f.transitions ?? [])].map((x) => x?.uuid).filter((u): u is string => !!u)
}

/** How we follow the face in an upload. Standard suits almost everyone. */
export const TRACKING = [
  { value: 's3fd', label: 'Standard', hint: 'Recommended', info: 'Works with the default lip-sync. Keep this unless you’ve been told otherwise.' },
  { value: 'dwpose', label: 'Full pose', info: 'Only for flows whose lip-sync is set to Detailed.' },
]

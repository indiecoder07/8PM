import { useCallback, useRef } from "react";
import { cx } from "../../utils/helpers";
import styles from "./Avatar.module.css";

/**
 * Renders a player avatar — image if available, coloured initials otherwise.
 * Optional pencil button triggers a file picker; click on avatar opens a zoom lightbox.
 *
 * @param {{ name: string, color: string, avatar?: string, small?: boolean, editable?: boolean, onAvatarChange?: (dataUrl: string) => void, className?: string }} props
 */
export function Avatar({
  name = "",
  color = "amber",
  avatar = "",
  small = false,
  editable = false,
  onAvatarChange,
  className,
}) {
  const fileRef = useRef(null);
  const lightboxRef = useRef(null);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasImage = Boolean(avatar);
  const toneClass =
    {
      amber: styles.colorAmber,
      mint: styles.colorMint,
      coral: styles.colorCoral,
      sky: styles.colorSky,
      slate: styles.colorSlate,
    }[color] || styles.colorAmber;

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Resize to a reasonable size to keep localStorage/Neon payload small
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 200;
          let w = img.width;
          let h = img.height;
          if (w > MAX || h > MAX) {
            const ratio = Math.min(MAX / w, MAX / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          onAvatarChange?.(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [onAvatarChange],
  );

  return (
    <>
      <div
        className={cx(styles.wrapper, small && styles.wrapperSmall, className)}
      >
        {/* Clickable avatar */}
        <button
          type="button"
          className={cx(styles.avatar, toneClass, small && styles.small)}
          aria-label={hasImage ? `View ${name} photo` : `${name} avatar`}
          onClick={hasImage ? () => lightboxRef.current?.showModal() : undefined}
          tabIndex={hasImage ? 0 : -1}
        >
          {hasImage ? (
            <img src={avatar} alt={name} className={styles.img} />
          ) : (
            initials
          )}
        </button>

        {/* Pencil edit button */}
        {editable && (
          <>
            <button
              type="button"
              className={styles.editBtn}
              aria-label={`Edit ${name} photo`}
              onClick={() => fileRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className={styles.hidden}
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {hasImage && (
        <dialog
          ref={lightboxRef}
          className={styles.lightboxDialog}
          aria-label="Avatar preview"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              lightboxRef.current?.close();
            }
          }}
        >
          <img src={avatar} alt={name} className={styles.lightboxImg} />
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => lightboxRef.current?.close()}
            aria-label="Close preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </dialog>
      )}
    </>
  );
}

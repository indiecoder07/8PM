import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { cx } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Players.module.css";

const DEFAULT_FORM = { name: "", number: "", color: "#f7b267" };

export function Players({ className }) {
  const { playerCards, addPlayer, togglePlayer, deletePlayer, updatePlayerAvatar } = useFieldIQ();
  const [form, setForm] = useState(DEFAULT_FORM);

  function handleSubmit(e) {
    e.preventDefault();
    const ok = addPlayer(form);
    if (ok) setForm((prev) => ({ ...DEFAULT_FORM, color: prev.color }));
  }

  return (
    <section className={cx(styles.root, className)}>
      {/* Add player form */}
      <div className={shared.panel}>
        <SectionTitle title="Add player" subtitle="Create and manage the squad" />
        <form className={shared.formGrid} onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Aarav Singh"
            />
          </label>
          <label>
            Jersey number
            <input
              value={form.number}
              onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
              placeholder="7"
            />
          </label>
          <label>
            Profile colour
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
            />
          </label>
          <button className={shared.primaryButton} type="submit">
            Save player
          </button>
        </form>
      </div>

      {/* Squad list */}
      <div className={shared.panel}>
        <SectionTitle
          title="Squad overview"
          subtitle="Historical stats are preserved when a player is inactive"
        />
        {playerCards.length === 0 ? (
          <p className={shared.muted}>No players yet. Add your first player above.</p>
        ) : (
          <div className={shared.stack}>
            {playerCards.map((player) => (
              <div className={styles.card} key={player.id}>
                <div className={styles.cardHead}>
                  <Avatar
                    name={player.name}
                    color={player.color}
                    avatar={player.avatar}
                    editable
                    onAvatarChange={(dataUrl) => updatePlayerAvatar(player.id, dataUrl)}
                  />
                  <div>
                    <h3 className={styles.cardName}>{player.name}</h3>
                    <p className={styles.cardSub}>
                      #{player.number || "--"} •{" "}
                      <span className={player.active ? styles.active : styles.inactive}>
                        {player.active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className={styles.stats}>
                  <Badge>{player.success.rate}% success</Badge>
                  <Badge>{player.success.attempts} chances</Badge>
                  <Badge>C score {player.totalContribution}</Badge>
                </div>

                <div className={styles.actions}>
                  <button
                    className={shared.ghostButton}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                  >
                    Mark {player.active ? "inactive" : "active"}
                  </button>
                  <button
                    className={shared.dangerButton}
                    type="button"
                    onClick={() => deletePlayer(player.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { PLAYER_COLOR_OPTIONS } from "../../data/seed";
import { cx } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Players.module.css";

export function Players({ className }) {
  const {
    playerCards,
    playerForm,
    updatePlayerFormField,
    submitPlayerForm,
    togglePlayer,
    deletePlayer,
    updatePlayerAvatar,
  } = useFieldIQ();

  function handleSubmit(e) {
    e.preventDefault();
    submitPlayerForm();
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
              value={playerForm.name}
              onChange={(e) => updatePlayerFormField("name", e.target.value)}
              placeholder="Aarav Singh"
            />
          </label>
          <label>
            Jersey number
            <input
              value={playerForm.number}
              onChange={(e) => updatePlayerFormField("number", e.target.value)}
              placeholder="7"
            />
          </label>
          <label>
            Profile colour
            <select
              value={playerForm.color}
              onChange={(e) => updatePlayerFormField("color", e.target.value)}
            >
              {PLAYER_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Clock3, GripVertical, MapPin, Plus, Trash2 } from "lucide-react";
import { useState, type DragEvent as ReactDragEvent } from "react";
import { EVENT_TIME_ZONE } from "@/lib/event-time";
import type { ProgramCredit, ProgramCreditSection, ProgramItem, WeddingProgram } from "@/lib/program";

type ProgramBookletProps = {
  eventAt: string;
  program: WeddingProgram;
  loading?: boolean;
  error?: string;
  preview?: boolean;
  editable?: boolean;
  onFieldChange?: (field: "title" | "subtitle", value: string) => void;
  onItemChange?: (id: string, field: keyof Omit<ProgramItem, "id">, value: string) => void;
  onAddItem?: () => void;
  onRemoveItem?: (id: string) => void;
  onMoveItem?: (fromIndex: number, toIndex: number) => void;
  onCreditChange?: (section: ProgramCreditSection, id: string, field: "title" | "description", value: string) => void;
  onAddCredit?: (section: ProgramCreditSection) => void;
  onRemoveCredit?: (section: ProgramCreditSection, id: string) => void;
};

function FloralSpray() {
  return (
    <svg aria-hidden="true" className="program-floral-art" focusable="false" viewBox="0 0 520 132">
      <path d="M12 112c72-53 116 11 189-35s113 20 182-28 92-10 125-34" fill="none" stroke="#526a5e" strokeWidth="3" />
      <path d="M64 88c-21-26-41-22-47-10 11 18 27 24 47 10Zm79 2c-9-26-27-33-39-24 6 19 18 28 39 24Zm114-17c-8-27-27-33-40-23 6 19 18 27 40 23Zm92-9c-9-25-27-31-39-22 5 18 18 26 39 22Zm97-31c-8-24-24-30-36-21 6 17 17 24 36 21Z" fill="#849182" />
      <g transform="translate(78 61)">
        <ellipse cx="0" cy="-15" rx="8" ry="15" fill="#c6a875" />
        <ellipse cx="14" cy="-5" rx="8" ry="15" transform="rotate(58 14 -5)" fill="#ead9b9" />
        <ellipse cx="9" cy="12" rx="8" ry="15" transform="rotate(120 9 12)" fill="#b48d61" />
        <ellipse cx="-9" cy="12" rx="8" ry="15" transform="rotate(-120 -9 12)" fill="#ead9b9" />
        <ellipse cx="-14" cy="-5" rx="8" ry="15" transform="rotate(-58 -14 -5)" fill="#b48d61" />
        <circle r="6" fill="#9b7049" />
      </g>
      <g transform="translate(255 60) scale(1.18)">
        <ellipse cx="0" cy="-15" rx="8" ry="15" fill="#d4b786" />
        <ellipse cx="14" cy="-5" rx="8" ry="15" transform="rotate(58 14 -5)" fill="#f0e5ce" />
        <ellipse cx="9" cy="12" rx="8" ry="15" transform="rotate(120 9 12)" fill="#b48d61" />
        <ellipse cx="-9" cy="12" rx="8" ry="15" transform="rotate(-120 -9 12)" fill="#f0e5ce" />
        <ellipse cx="-14" cy="-5" rx="8" ry="15" transform="rotate(-58 -14 -5)" fill="#b48d61" />
        <circle r="6" fill="#9b7049" />
      </g>
      <g transform="translate(444 34) scale(.86)">
        <ellipse cx="0" cy="-15" rx="8" ry="15" fill="#c6a875" />
        <ellipse cx="14" cy="-5" rx="8" ry="15" transform="rotate(58 14 -5)" fill="#ead9b9" />
        <ellipse cx="9" cy="12" rx="8" ry="15" transform="rotate(120 9 12)" fill="#b48d61" />
        <ellipse cx="-9" cy="12" rx="8" ry="15" transform="rotate(-120 -9 12)" fill="#ead9b9" />
        <ellipse cx="-14" cy="-5" rx="8" ry="15" transform="rotate(-58 -14 -5)" fill="#b48d61" />
        <circle r="6" fill="#9b7049" />
      </g>
    </svg>
  );
}

function ProgramCredits({
  credits,
  editable,
  section,
  onChange,
  onAdd,
  onRemove,
}: {
  credits: ProgramCredit[];
  editable: boolean;
  section: ProgramCreditSection;
  onChange?: ProgramBookletProps["onCreditChange"];
  onAdd?: ProgramBookletProps["onAddCredit"];
  onRemove?: ProgramBookletProps["onRemoveCredit"];
}) {
  const heading = section === "functionaries" ? "Functionaries" : "Photography";
  const entryLabel = section === "functionaries" ? "functionary" : "photography credit";
  const addLabel = section === "functionaries" ? "Add person" : "Add credit";

  return (
    <section className={`program-credits program-credits-${section}`} aria-label={heading}>
      <p className="program-script-heading program-credits-heading">{heading}</p>
      {editable && (
        <div className="program-inline-actions">
          <span>{credits.length} / 30 entries</span>
          <button
            className="program-add-inline"
            disabled={credits.length >= 30}
            onClick={() => onAdd?.(section)}
            type="button"
          >
            <Plus size={12} /> {addLabel}
          </button>
        </div>
      )}
      {credits.length === 0 ? (
        <p className="program-credit-empty">{editable ? `Add ${heading.toLowerCase()} details here.` : "To be announced"}</p>
      ) : (
        <ul className="program-credit-list">
          {credits.map((credit, index) => (
            <li className={`program-credit-item${editable ? " program-credit-item-editable" : ""}`} key={credit.id}>
              {editable ? (
                <>
                  <input
                    aria-label={`${heading} ${index + 1} name or role`}
                    className="program-credit-title program-inline-field"
                    maxLength={120}
                    onChange={(event) => onChange?.(section, credit.id, "title", event.target.value)}
                    placeholder="Name or role"
                    required
                    value={credit.title}
                  />
                  <textarea
                    aria-label={`${heading} ${index + 1} details`}
                    className="program-credit-description program-inline-field"
                    maxLength={500}
                    onChange={(event) => onChange?.(section, credit.id, "description", event.target.value)}
                    placeholder="Details (optional)"
                    rows={2}
                    value={credit.description}
                  />
                  <button
                    aria-label={`Remove ${entryLabel} ${index + 1}`}
                    className="program-inline-remove"
                    onClick={() => onRemove?.(section, credit.id)}
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              ) : (
                <>
                  <strong>{credit.title}</strong>
                  {credit.description && <p>{credit.description}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProgramBooklet({
  eventAt,
  program,
  loading = false,
  error = "",
  preview = false,
  editable = false,
  onFieldChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onCreditChange,
  onAddCredit,
  onRemoveCredit,
}: ProgramBookletProps) {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const eventDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(eventAt));
  const eventTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(eventAt));
  const agendaHeadingId = preview ? "program-preview-title" : "program-title";

  function startDraggingItem(event: ReactDragEvent<HTMLButtonElement>, index: number) {
    setDraggedItemIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function dropItem(event: ReactDragEvent<HTMLLIElement>, targetIndex: number) {
    event.preventDefault();
    const dataIndex = event.dataTransfer.getData("text/plain");
    const sourceIndex = draggedItemIndex ?? (dataIndex ? Number(dataIndex) : Number.NaN);
    if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < program.items.length) {
      onMoveItem?.(sourceIndex, targetIndex);
    }
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  }

  return (
    <div className={`program-page${preview ? " program-page-preview" : ""}`}>
      {!preview && (
        <nav className="program-topbar" aria-label="Wedding navigation">
          <Link href="/"><ArrowLeft size={14} />Welcome</Link>
          <Link className="program-rsvp-link" href="/rsvp">RSVP <span aria-hidden="true">↗</span></Link>
        </nav>
      )}

      <div className="program-spread">
        <article className="program-sheet welcome-sheet">
          <div className="program-floral program-floral-top"><FloralSpray /></div>
          <p className="program-script-heading welcome-script">Welcome</p>
          <p className="welcome-kicker">TO THE WEDDING OF</p>
          <h1 className="welcome-couple serif">
            <span>Christian</span>
            <em>&amp;</em>
            <span>Naomi</span>
          </h1>
          {editable ? (
            <textarea
              aria-label="Welcome message"
              className="welcome-intro program-inline-field program-inline-welcome"
              maxLength={200}
              onChange={(event) => onFieldChange?.("subtitle", event.target.value)}
              rows={2}
              value={program.subtitle}
            />
          ) : (
            <p className="welcome-intro">{program.subtitle}</p>
          )}

          <div className="invitation-details">
            <p><CalendarDays size={15} />{eventDate}</p>
            <p><Clock3 size={15} />{eventTime}</p>
            <p><MapPin size={15} /><span>The Church of Pentecost, Agona-Fie Assembly<br />Agona Nkwanta</span></p>
          </div>

          <div className="program-ornament-divider" aria-hidden="true"><span>✦</span></div>
          <ProgramCredits
            credits={program.functionaries}
            editable={editable}
            onAdd={onAddCredit}
            onChange={onCreditChange}
            onRemove={onRemoveCredit}
            section="functionaries"
          />
          <div className="program-floral program-floral-bottom"><FloralSpray /></div>
        </article>

        <section className="program-sheet agenda-sheet" aria-labelledby={agendaHeadingId}>
          <div className="program-floral program-floral-top"><FloralSpray /></div>
          <div className="program-rings" aria-hidden="true"><span /><span /><i>✦</i></div>
          {editable ? (
            <input
              aria-label="Program title"
              className="program-script-heading agenda-script program-inline-field program-inline-title"
              maxLength={100}
              onChange={(event) => onFieldChange?.("title", event.target.value)}
              required
              value={program.title}
            />
          ) : (
            <p className="program-script-heading agenda-script">{program.title}</p>
          )}
          <div className="program-ornament-divider agenda-divider" aria-hidden="true"><span>✦</span></div>
          <h2 id={agendaHeadingId} className="agenda-heading">The order of celebration</h2>
          {editable && (
            <>
              <div className="program-inline-actions">
                <span>{program.items.length} / 30 events</span>
                <button
                  className="program-add-inline"
                  disabled={program.items.length >= 30}
                  onClick={onAddItem}
                  type="button"
                >
                  <Plus size={12} /> Add event
                </button>
              </div>
              {program.items.length > 1 && <p className="program-reorder-hint">Drag the grip to reorder, or use the arrow buttons.</p>}
            </>
          )}

          {loading ? (
            <div className="program-state">Preparing the day’s program…</div>
          ) : error ? (
            <div className="program-state program-error" role="status">{error}</div>
          ) : program.items.length === 0 ? (
            <div className="program-state">
              {editable ? "Add an event to start the wedding day outline." : <>The wedding day program is being prepared.<br />Please check back soon.</>}
            </div>
          ) : (
            <ol className={`program-list${editable ? " program-list-editable" : ""}`}>
              {program.items.map((item, index) => (
                <li
                  className={`public-program-item${editable ? " public-program-item-editable" : ""}${draggedItemIndex === index ? " program-item-dragging" : ""}${dropTargetIndex === index ? " program-item-drop-target" : ""}`}
                  key={item.id}
                  onDragOver={editable ? (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetIndex(index);
                  } : undefined}
                  onDrop={editable ? (event) => dropItem(event, index) : undefined}
                >
                  {editable ? (
                    <>
                      <div className="program-item-toolbar" aria-label={`Reorder event ${index + 1}`}>
                        <button
                          aria-label={`Drag event ${index + 1} to reorder`}
                          className="program-item-drag-handle"
                          draggable
                          onDragEnd={() => {
                            setDraggedItemIndex(null);
                            setDropTargetIndex(null);
                          }}
                          onDragStart={(event) => startDraggingItem(event, index)}
                          title="Drag to reorder"
                          type="button"
                        >
                          <GripVertical size={13} />
                        </button>
                        <button
                          aria-label={`Move event ${index + 1} up`}
                          className="program-item-order-button"
                          disabled={index === 0}
                          onClick={() => onMoveItem?.(index, index - 1)}
                          type="button"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          aria-label={`Move event ${index + 1} down`}
                          className="program-item-order-button"
                          disabled={index === program.items.length - 1}
                          onClick={() => onMoveItem?.(index, index + 1)}
                          type="button"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          aria-label={`Remove event ${index + 1}`}
                          className="program-inline-remove"
                          onClick={() => onRemoveItem?.(item.id)}
                          type="button"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <input
                        aria-label={`Event ${index + 1} title`}
                        className="public-program-item-title program-inline-field"
                        maxLength={100}
                        onChange={(event) => onItemChange?.(item.id, "title", event.target.value)}
                        placeholder="Event title"
                        required
                        value={item.title}
                      />
                      <input
                        aria-label={`Event ${index + 1} time`}
                        className="public-program-time program-inline-field"
                        maxLength={40}
                        onChange={(event) => onItemChange?.(item.id, "time", event.target.value)}
                        placeholder="Time"
                        required
                        value={item.time}
                      />
                      <textarea
                        aria-label={`Event ${index + 1} details`}
                        className="public-program-copy program-inline-field program-inline-description"
                        maxLength={500}
                        onChange={(event) => onItemChange?.(item.id, "description", event.target.value)}
                        placeholder="Details (optional)"
                        rows={2}
                        value={item.description}
                      />
                    </>
                  ) : (
                    <>
                      <h3>{item.title}</h3>
                      {item.time && <p className="public-program-time">{item.time}</p>}
                      {item.description && <p className="public-program-copy">{item.description}</p>}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="program-ornament-divider photography-divider" aria-hidden="true"><span>✦</span></div>
          <ProgramCredits
            credits={program.photography}
            editable={editable}
            onAdd={onAddCredit}
            onChange={onCreditChange}
            onRemove={onRemoveCredit}
            section="photography"
          />

          <footer className="agenda-footer">
            <p>Thank you for celebrating with us</p>
            <span>Christian &amp; Naomi</span>
          </footer>
          <div className="program-floral program-floral-bottom"><FloralSpray /></div>
        </section>
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type Mode = "inclusive" | "exclusive" | "time-based" | "any-presence";

const MODES: Array<{
  id: Mode;
  title: string;
  description: string;
}> = [
  {
    id: "inclusive",
    title: "Inclusive calendar days",
    description: "Counts arrival and departure dates as full days.",
  },
  {
    id: "exclusive",
    title: "Exclusive (departure excluded)",
    description: "Counts full days between dates, excluding departure.",
  },
  {
    id: "time-based",
    title: "Time-based (24-hour blocks)",
    description: "Uses exact time difference and floors to full 24-hour periods.",
  },
  {
    id: "any-presence",
    title: "Any presence",
    description: "Counts any calendar day with any presence in-country.",
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Result = {
  days: number | null;
  summary: string;
  detail?: string;
  error?: string;
};

type EndDateResult = {
  endDate: string | null;
  endTime?: string;
  summary: string;
  detail?: string;
  error?: string;
};

const parseDateParts = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
};

const dateOnlyUtc = (value: string) => {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
};

const parseTimeParts = (value: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
};

const combineDateTime = (dateValue: string, timeValue: string) => {
  const dateParts = parseDateParts(dateValue);
  const timeParts = parseTimeParts(timeValue);
  if (!dateParts || !timeParts) return null;
  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    0,
    0,
  );
};

const formatUtcDate = (utcMs: number) => {
  const date = new Date(utcMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateEndDate = ({
  arrivalDate,
  arrivalTime,
  totalDaysInput,
  mode,
}: {
  arrivalDate: string;
  arrivalTime: string;
  totalDaysInput: string;
  mode: Mode;
}): EndDateResult => {
  if (!arrivalDate) {
    return {
      endDate: null,
      summary: "Add an arrival date to calculate an end date.",
    };
  }

  if (!totalDaysInput) {
    return {
      endDate: null,
      summary: "Enter total days to calculate the end date.",
    };
  }

  const totalDays = Number(totalDaysInput);
  if (!Number.isInteger(totalDays) || totalDays < 1) {
    return {
      endDate: null,
      summary: "Total days must be a whole number (1 or more).",
      error: "invalid-total-days",
    };
  }

  const startUtc = dateOnlyUtc(arrivalDate);
  if (startUtc === null) {
    return { endDate: null, summary: "Check your arrival date input." };
  }

  if (mode === "inclusive" || mode === "any-presence") {
    const endDateUtc = startUtc + (totalDays - 1) * MS_PER_DAY;
    return {
      endDate: formatUtcDate(endDateUtc),
      summary: `End date: ${formatUtcDate(endDateUtc)}.`,
      detail: "Formula: arrival + (total days - 1).",
    };
  }

  if (mode === "exclusive") {
    const endDateUtc = startUtc + totalDays * MS_PER_DAY;
    return {
      endDate: formatUtcDate(endDateUtc),
      summary: `Departure date: ${formatUtcDate(endDateUtc)}.`,
      detail: "Exclusive mode excludes the departure day.",
    };
  }

  if (!arrivalTime) {
    return {
      endDate: null,
      summary: "Time-based mode needs an arrival time to calculate the end date.",
    };
  }

  const arrival = combineDateTime(arrivalDate, arrivalTime);
  if (!arrival) {
    return {
      endDate: null,
      summary: "Check your arrival date/time input.",
      error: "invalid-arrival",
    };
  }

  const end = new Date(arrival.getTime() + totalDays * MS_PER_DAY);
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(
    end.getDate(),
  ).padStart(2, "0")}`;
  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(
    2,
    "0",
  )}`;

  return {
    endDate,
    endTime,
    summary: `End date/time: ${endDate} ${endTime}.`,
    detail: "Time-based mode adds full 24-hour blocks from arrival.",
  };
};

const calculateDays = ({
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  mode,
}: {
  arrivalDate: string;
  departureDate: string;
  arrivalTime: string;
  departureTime: string;
  mode: Mode;
}): Result => {
  if (!arrivalDate || !departureDate) {
    return {
      days: null,
      summary: "Add both arrival and departure dates to begin.",
    };
  }

  const startUtc = dateOnlyUtc(arrivalDate);
  const endUtc = dateOnlyUtc(departureDate);

  if (startUtc === null || endUtc === null) {
    return { days: null, summary: "Check your date inputs." };
  }

  if (endUtc < startUtc) {
    return {
      days: null,
      summary: "Departure date must be on or after arrival.",
      error: "invalid-range",
    };
  }

  const diffDays = Math.round((endUtc - startUtc) / MS_PER_DAY);

  if (mode === "inclusive") {
    return {
      days: diffDays + 1,
      summary: `Inclusive count: ${diffDays + 1} calendar day${diffDays ? "s" : ""}.`,
      detail: "Formula: (departure - arrival) + 1.",
    };
  }

  if (mode === "exclusive") {
    return {
      days: diffDays,
      summary: `Exclusive count: ${diffDays} calendar day${diffDays === 1 ? "" : "s"}.`,
      detail: "Formula: (departure - arrival).",
    };
  }

  if (mode === "time-based") {
    if (!arrivalTime || !departureTime) {
      return {
        days: null,
        summary: "Time-based mode needs both arrival and departure times.",
      };
    }
    const start = combineDateTime(arrivalDate, arrivalTime);
    const end = combineDateTime(departureDate, departureTime);
    if (!start || !end) {
      return {
        days: null,
        summary: "Check your date/time inputs.",
      };
    }
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
      return {
        days: null,
        summary: "Departure time must be after arrival time.",
        error: "invalid-range",
      };
    }
    const totalHours = diffMs / (60 * 60 * 1000);
    const fullDays = Math.floor(diffMs / MS_PER_DAY);
    const leftoverHours = Math.max(0, totalHours - fullDays * 24);
    return {
      days: fullDays,
      summary: `Time-based count: ${fullDays} full 24-hour block${fullDays === 1 ? "" : "s"}.`,
      detail: `${totalHours.toFixed(2)} total hours (${leftoverHours.toFixed(2)} hours beyond full days).`,
    };
  }

  if (mode === "any-presence") {
    const hasBothTimes = Boolean(arrivalTime && departureTime);
    if (hasBothTimes) {
      const start = combineDateTime(arrivalDate, arrivalTime);
      const end = combineDateTime(departureDate, departureTime);
      if (!start || !end) {
        return { days: null, summary: "Check your date/time inputs." };
      }
      if (end.getTime() < start.getTime()) {
        return {
          days: null,
          summary: "Departure time must be after arrival time.",
          error: "invalid-range",
        };
      }
      const startDayUtc = Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      );
      const endDayUtc = Date.UTC(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
      );
      const daySpan = Math.round((endDayUtc - startDayUtc) / MS_PER_DAY);
      return {
        days: daySpan + 1,
        summary: `Any-presence count: ${daySpan + 1} calendar day${daySpan ? "s" : ""}.`,
        detail: "Counts every day with any time in-country.",
      };
    }

    return {
      days: diffDays + 1,
      summary: `Any-presence count: ${diffDays + 1} calendar day${diffDays ? "s" : ""}.`,
      detail: "Add arrival and departure times for finer precision.",
    };
  }

  return { days: null, summary: "Choose a calculation mode." };
};

export default function Home() {
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [totalDaysInput, setTotalDaysInput] = useState("");
  const [mode, setMode] = useState<Mode>("inclusive");

  const result = useMemo(
    () =>
      calculateDays({
        arrivalDate,
        departureDate,
        arrivalTime,
        departureTime,
        mode,
      }),
    [arrivalDate, departureDate, arrivalTime, departureTime, mode],
  );

  const endDateResult = useMemo(
    () =>
      calculateEndDate({
        arrivalDate,
        arrivalTime,
        totalDaysInput,
        mode,
      }),
    [arrivalDate, arrivalTime, totalDaysInput, mode],
  );

  return (
    <div className="page">
      <div className="shell">
        <section className="hero reveal" style={{ "--delay": "0s" } as CSSProperties}>
          <div className="eyebrow">Country day counter</div>
          <h1 className="title">Count days in-country with your rulebook.</h1>
          <p className="subtitle">
            Compare inclusive, exclusive, time-based, and any-presence calculations.
            All date-only math uses calendar days; time-based mode uses 24-hour periods.
          </p>
          <div className="pill-row">
            <span className="pill">Client-only</span>
            <span className="pill">Local time zone</span>
            <span className="pill">Instant updates</span>
          </div>
        </section>

        <section className="grid">
          <div className="card reveal" style={{ "--delay": "0.1s" } as CSSProperties}>
            <h2>Stay details</h2>
            <div className="grid">
              <label className="field">
                <span className="label">Arrival date</span>
                <input
                  className="input"
                  type="date"
                  value={arrivalDate}
                  onChange={(event) => setArrivalDate(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Departure date</span>
                <input
                  className="input"
                  type="date"
                  value={departureDate}
                  onChange={(event) => setDepartureDate(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Arrival time (optional)</span>
                <input
                  className="input"
                  type="time"
                  value={arrivalTime}
                  onChange={(event) => setArrivalTime(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Departure time (optional)</span>
                <input
                  className="input"
                  type="time"
                  value={departureTime}
                  onChange={(event) => setDepartureTime(event.target.value)}
                />
              </label>
            </div>
            <p className="note">
              All calculations use your device time zone. For time-based or any-presence mode,
              add times for finer precision.
            </p>
          </div>

          <div className="card reveal" style={{ "--delay": "0.2s" } as CSSProperties}>
            <h2>Calculation mode</h2>
            <div className="mode-grid">
              {MODES.map((option) => (
                <button
                  key={option.id}
                  className={`mode ${mode === option.id ? "active" : ""}`}
                  onClick={() => setMode(option.id)}
                  type="button"
                >
                  <span className="mode-title">{option.title}</span>
                  <span className="mode-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card reveal" style={{ "--delay": "0.3s" } as CSSProperties}>
            <h2>Result</h2>
            <div className="result">
              <div className="value">
                {result.days === null ? "—" : `${result.days} day${result.days === 1 ? "" : "s"}`}
              </div>
              <div>{result.summary}</div>
              {result.detail ? <div className="note">{result.detail}</div> : null}
              {result.error ? (
                <div className="note">Fix the date/time range to continue.</div>
              ) : null}
            </div>
            <div style={{ marginTop: "16px" }}>
              <label className="field">
                <span className="label">Total days in country</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 90"
                  value={totalDaysInput}
                  onChange={(event) => setTotalDaysInput(event.target.value)}
                />
              </label>
              <div className="result" style={{ marginTop: "12px" }}>
                <div className="value" style={{ fontSize: "1.6rem" }}>
                  {endDateResult.endDate
                    ? endDateResult.endTime
                      ? `${endDateResult.endDate} ${endDateResult.endTime}`
                      : endDateResult.endDate
                    : "—"}
                </div>
                <div>{endDateResult.summary}</div>
                {endDateResult.detail ? <div className="note">{endDateResult.detail}</div> : null}
                {endDateResult.error ? (
                  <div className="note">Fix inputs to calculate the end date.</div>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <button
                className="cta"
                type="button"
                onClick={() => {
                  setArrivalDate("");
                  setDepartureDate("");
                  setArrivalTime("");
                  setDepartureTime("");
                  setTotalDaysInput("");
                  setMode("inclusive");
                }}
              >
                Reset inputs
              </button>
            </div>
          </div>
        </section>

        <section className="card reveal" style={{ "--delay": "0.4s" } as CSSProperties}>
          <h2>Quick examples</h2>
          <div className="grid">
            <button
              className="mode"
              type="button"
              onClick={() => {
                setArrivalDate("2026-02-05");
                setDepartureDate("2026-02-07");
                setArrivalTime("");
                setDepartureTime("");
                setMode("inclusive");
              }}
            >
              <span className="mode-title">Weekend trip</span>
              <span className="mode-desc">Feb 5 → Feb 7, inclusive mode.</span>
            </button>
            <button
              className="mode"
              type="button"
              onClick={() => {
                setArrivalDate("2026-02-05");
                setDepartureDate("2026-02-07");
                setArrivalTime("22:30");
                setDepartureTime("05:30");
                setMode("time-based");
              }}
            >
              <span className="mode-title">Overnight layover</span>
              <span className="mode-desc">10 hours total, time-based mode.</span>
            </button>
            <button
              className="mode"
              type="button"
              onClick={() => {
                setArrivalDate("2026-02-05");
                setDepartureDate("2026-02-05");
                setArrivalTime("08:15");
                setDepartureTime("23:40");
                setMode("any-presence");
              }}
            >
              <span className="mode-title">Same-day visit</span>
              <span className="mode-desc">Counts one day with any presence.</span>
            </button>
          </div>
        </section>

        <section className="footer reveal" style={{ "--delay": "0.5s" } as CSSProperties}>
          Tip: if you need exact legal residency rules, verify the official policy for the
          country. This tool is a calculator, not legal advice.
        </section>
      </div>
    </div>
  );
}

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import AskIrisEntry from "@/components/iris/AskIrisEntry";
import ApproxPrice from "@/components/price/ApproxPrice";
import AlternativesExpander from "@/components/lens/AlternativesExpander";
import AlternativeLensActions from "@/components/lens/AlternativeLensActions";
import {
  ALTERNATIVES_SHOWN,
  apertureDelta,
  findSameFocalAlternatives,
  focalDelta,
  focalSpan,
  lensKind,
  stopsText,
  weightDelta,
} from "@/lib/lens/alternatives";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { focalRangeDisplay, lensDisplayName, lensSubtitleLine, primaryApertureDisplay, weightDisplay, brandLabel } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import { lensPath } from "@/lib/url/routes";
import { PAGE_SECTION_CLS, SECTION_HEADING_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

type T = Awaited<ReturnType<typeof getTranslations<"Alternatives">>>;
type BrandT = Awaited<ReturnType<typeof getTranslations<"Brands">>>;

const EXTRA_ROW_CLS = "hidden group-data-expanded/alternatives:table-row";
const EXTRA_ITEM_CLS = "hidden group-data-expanded/alternatives:flex";

function apertureNote(t: T, current: Lens, other: Lens): string | null {
  const delta = apertureDelta(current, other);
  if (!delta) {
    return null;
  }
  switch (delta.kind) {
    case "same":
      return t("same");
    case "constant":
      return t("constant");
    default:
      return t(delta.kind === "brighter" ? "faster" : "slower", {
        stops: stopsText(delta.thirds),
        plural: delta.thirds > 3 ? "yes" : "no",
      });
  }
}

function weightNote(t: T, current: Lens, other: Lens, { long }: { long: boolean }): string {
  const delta = weightDelta(current, other);
  switch (delta.kind) {
    case "same":
      return t(long ? "sameWeight" : "same");
    case "close":
      return t(long ? "closeWeight" : "close");
    default:
      return t(delta.kind, { grams: delta.grams });
  }
}

function focalNote(t: T, current: Lens, other: Lens): string | null {
  const { wider, longer } = focalDelta(current, other);
  const parts = [
    wider > 0 ? t("wider", { mm: wider }) : wider < 0 ? t("lessWide", { mm: -wider }) : null,
    longer > 0 ? t("longer", { mm: longer }) : longer < 0 ? t("shorter", { mm: -longer }) : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(t("listSeparator")) : null;
}

function boolText(t: T, value: boolean | "partial"): string {
  return value === "partial" ? t("partial") : t(value ? "yes" : "no");
}

function Valued({ value, note }: { value: string; note: string | null }) {
  return (
    <span className="flex flex-col">
      <span>{value}</span>
      {note && <span className="text-xs whitespace-normal text-zinc-500">{note}</span>}
    </span>
  );
}

function ColumnHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function LensName({ lens, brand, current }: { lens: Lens; brand: string; current?: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {current && (
          <span className="shrink-0 rounded bg-zinc-900 px-1.5 text-[10px] leading-4 font-semibold tracking-normal whitespace-nowrap normal-case text-white">
            {current}
          </span>
        )}
        {lensSubtitleLine(brand, lens.series)}
      </span>
      <span className="font-semibold text-zinc-900">{lens.model}</span>
    </span>
  );
}

function Thumb({ lens, size, current = false }: { lens: Lens; size: "table" | "list"; current?: boolean }) {
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-lg", current ? "bg-white" : "bg-zinc-50", size === "table" ? "size-10" : "size-14")}>
      <Image src={getLensImageUrl(lens.id)} alt="" fill sizes={size === "table" ? "40px" : "56px"} style={lensImageStyle} className="object-contain p-1" />
    </span>
  );
}

export default async function SameFocalAlternatives({ lens, lenses }: { lens: Lens; lenses: readonly Lens[] }) {
  const alternatives = findSameFocalAlternatives(lens, lenses);
  if (alternatives.length === 0) {
    return null;
  }

  const t = await getTranslations("Alternatives");
  const tBrand: BrandT = await getTranslations("Brands");
  const kind = lensKind(lens);
  const zoom = kind === "zoom";
  const name = lensDisplayName(brandLabel(tBrand, lens.brand), lens.series, lens.model);
  const span = focalSpan(zoom ? [lens] : [lens, ...alternatives]);
  const range = focalRangeDisplay(span.min, span.max);
  const hidden = alternatives.length - ALTERNATIVES_SHOWN;
  const focusText = (l: Lens) => t(l.af ? "focusAuto" : "focusManual");
  const aperture = (l: Lens) => primaryApertureDisplay(l) ?? "—";
  const weight = (l: Lens) => weightDisplay(l.weightG, "g") ?? "—";

  const headers = [
    t("columnLens"),
    ...(zoom ? [t("columnRange")] : []),
    t("columnAperture"),
    t("columnWeight"),
  ];
  const featureHeaders = [
    <ColumnHeader key="af" icon={FEATURE_ICONS.af} label={t("columnFocus")} />,
    ...(zoom ? [<ColumnHeader key="ois" icon={FEATURE_ICONS.ois} label={t("columnOis")} />] : []),
    <ColumnHeader key="wr" icon={FEATURE_ICONS.wr} label={t("columnWr")} />,
  ];
  const columnCount = headers.length + featureHeaders.length + 2;
  const featureCells = (l: Lens) => [
    focusText(l),
    ...(zoom ? [boolText(t, l.ois)] : []),
    boolText(t, l.wr),
  ];
  const phoneFeatures = (l: Lens) =>
    [
      t(l.af ? "autofocus" : "manualFocus"),
      ...(zoom && l.ois ? [t("stabilized")] : []),
      ...(l.wr ? [t(l.wr === "partial" ? "partlySealed" : "weatherSealed")] : []),
    ].join(" · ");
  const phoneNotes = (l: Lens) =>
    [
      ...(zoom ? [focalRangeDisplay(l.focalLengthMin, l.focalLengthMax)] : []),
      apertureDelta(lens, l)?.kind === "same" ? t("sameAperture") : apertureNote(t, lens, l) ?? aperture(l),
      weightNote(t, lens, l, { long: true }),
    ].join(" · ");

  const compareProps = (l: Lens) => ({
    lensId: l.id,
    lensName: lensDisplayName(brandLabel(tBrand, l.brand), l.series, l.model),
    currentId: lens.id,
    currentName: name,
  });

  const rows = (
    <>
      <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            {headers.map((label) => (
              <th key={label} scope="col" className="px-1.5 py-2.5 font-normal first:pl-4">
                {label}
              </th>
            ))}
            {featureHeaders.map((header) => (
              <th key={header.key} scope="col" className="px-1.5 py-2.5 font-normal">
                {header}
              </th>
            ))}
            <th scope="col" className="px-1.5 py-2.5 font-normal">{t("columnPrice")}</th>
            <th scope="col" className="w-0 py-2.5 pr-4"><span className="sr-only">{t("compare")}</span></th>
          </tr>
        </thead>
        <tbody className="text-zinc-700">
          <tr className="border-t border-zinc-200 bg-zinc-100 font-semibold text-zinc-900">
            <td className="py-3.5 pr-2 pl-4 shadow-[inset_3px_0_0_var(--color-zinc-900)]">
              <span className="flex items-center gap-3">
                <Thumb lens={lens} size="table" current />
                <LensName lens={lens} brand={brandLabel(tBrand, lens.brand)} current={t("current")} />
              </span>
            </td>
            {zoom && <td className="px-1.5 py-3">{focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax)}</td>}
            <td className="px-1.5 py-3">{aperture(lens)}</td>
            <td className="px-1.5 py-3">{weight(lens)}</td>
            {featureCells(lens).map((text, i) => (
              <td key={i} className="px-1.5 py-3">{text}</td>
            ))}
            <td className="px-1.5 py-3"><ApproxPrice pricing={lens.pricing} /></td>
            <td className="py-3 pr-4" />
          </tr>
          <tr>
            <td colSpan={columnCount} className="border-t border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[11px] tracking-[0.08em] text-zinc-500">
              {t("comparedWith")}
            </td>
          </tr>
          {alternatives.map((l, index) => (
            <tr key={l.id} className={cn("group relative border-t border-zinc-100 transition-colors hover:bg-zinc-50", index >= ALTERNATIVES_SHOWN && EXTRA_ROW_CLS)}>
              <td className="py-3 pr-2 pl-4">
                <Link href={lensPath(l)} prefetch={false} className="flex items-center gap-3 after:absolute after:inset-0 after:content-['']">
                  <Thumb lens={l} size="table" />
                  <LensName lens={l} brand={brandLabel(tBrand, l.brand)} />
                </Link>
              </td>
              {zoom && (
                <td className="px-1.5 py-3">
                  <Valued value={focalRangeDisplay(l.focalLengthMin, l.focalLengthMax)} note={focalNote(t, lens, l)} />
                </td>
              )}
              <td className="px-1.5 py-3"><Valued value={aperture(l)} note={apertureNote(t, lens, l)} /></td>
              <td className="px-1.5 py-3"><Valued value={weight(l)} note={weightNote(t, lens, l, { long: false })} /></td>
              {featureCells(l).map((text, i) => (
                <td key={i} className="px-1.5 py-3">{text}</td>
              ))}
              <td className="px-1.5 py-3"><ApproxPrice pricing={l.pricing} /></td>
              <td className="py-3 pr-4 text-right">
                <AlternativeLensActions {...compareProps(l)} className="justify-end" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <ul className="text-sm lg:hidden">
        <li className="flex items-center gap-3 bg-zinc-100 px-4 py-3.5 shadow-[inset_3px_0_0_var(--color-zinc-900)]">
          <Thumb lens={lens} size="list" current />
          <div className="flex min-w-0 flex-col gap-1">
            <LensName lens={lens} brand={brandLabel(tBrand, lens.brand)} current={t("current")} />
            <span className="text-[13px] text-zinc-600">
              {[...(zoom ? [focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax)] : []), aperture(lens), weight(lens), phoneFeatures(lens)].join(" · ")}
            </span>
            <ApproxPrice pricing={lens.pricing} />
          </div>
        </li>
        <li className="border-t border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[11px] tracking-[0.08em] text-zinc-500">{t("comparedWith")}</li>
        {alternatives.map((l, index) => (
          <li
            key={l.id}
            className={cn("group relative flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50", index >= ALTERNATIVES_SHOWN && EXTRA_ITEM_CLS)}
          >
            <Link href={lensPath(l)} prefetch={false} className="flex min-w-0 items-center gap-3 after:absolute after:inset-0 after:content-['']">
              <Thumb lens={l} size="list" />
              <div className="flex min-w-0 flex-col gap-1">
                <LensName lens={l} brand={brandLabel(tBrand, l.brand)} />
                <span className="text-[13px] text-zinc-600">{phoneNotes(l)}</span>
                <div className="flex flex-wrap items-baseline gap-x-3 text-[13px] text-zinc-500">
                  <span>{phoneFeatures(l)}</span>
                  <ApproxPrice pricing={l.pricing} />
                </div>
              </div>
            </Link>
            <AlternativeLensActions {...compareProps(l)} className="self-end" />
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <section className={cn(PAGE_SECTION_CLS, "flex flex-col gap-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className={SECTION_HEADING_CLS}>{t(zoom ? "titleZoom" : "titlePrime")}</h2>
          <p className="text-[13px] text-zinc-500">
            {t(zoom ? "summaryZoom" : "summaryPrime", { count: alternatives.length, range })}
          </p>
        </div>
        <AskIrisEntry
          id="alternatives"
          label={t("askIris")}
          question={t(zoom ? "askIrisQuestionZoom" : "askIrisQuestionPrime", { name })}
          className="self-start sm:self-auto"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        {hidden > 0 ? (
          <AlternativesExpander showMoreLabel={t("showMore", { count: hidden })} showLessLabel={t("showLess")}>
            {rows}
          </AlternativesExpander>
        ) : (
          rows
        )}
      </div>
      <p className="text-xs text-zinc-500">{t("footnote")}</p>
    </section>
  );
}

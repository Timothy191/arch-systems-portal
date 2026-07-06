import { Machine } from "./HourlyLoadsGrid";

interface Site {
  id: string;
  name: string;
  site_code: string;
}

interface ColumnConfigOptions {
  containerWidth: number;
  hasBinFactors: boolean;
  machines: Machine[];
  sites: Site[];
  hourLabels: string[];
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

export function getHourlyLoadsColumns({
  containerWidth,
  hasBinFactors,
  machines,
  sites,
  hourLabels,
}: ColumnConfigOptions): any[] {
  const width = containerWidth || 1150;

  // Proportional widths that sum to 100%
  let machineColSize = 140;
  let siteColSize = 100;
  let materialColSize = 100;
  let hourColSize = 56;
  let totalColSize = 70;
  let binFactorColSize = 80;
  let totalMaterialColSize = 100;

  if (hasBinFactors) {
    machineColSize = Math.max(140, Math.floor(width * 0.1));
    siteColSize = Math.max(100, Math.floor(width * 0.08));
    materialColSize = Math.max(100, Math.floor(width * 0.08));
    hourColSize = Math.max(80, Math.floor(width * 0.045));
    totalColSize = Math.max(80, Math.floor(width * 0.06));
    binFactorColSize = Math.max(80, Math.floor(width * 0.06));
    totalMaterialColSize = Math.max(100, Math.floor(width * 0.08));
  } else {
    machineColSize = Math.max(140, Math.floor(width * 0.12));
    siteColSize = Math.max(100, Math.floor(width * 0.1));
    materialColSize = Math.max(100, Math.floor(width * 0.08));
    hourColSize = Math.max(80, Math.floor(width * 0.055));
    totalColSize = Math.max(80, Math.floor(width * 0.04));
  }

  const cols: any[] = [
    {
      prop: "machineName",
      name: "Machine",
      size: machineColSize,
      pin: "colPinStart" as const,
    },
    {
      prop: "siteName",
      name: "Site",
      size: siteColSize,
      pin: "colPinStart" as const,
      sortable: false,
      readonly: true,
      cellTemplate: (h: any, { rowIndex }: { rowIndex: number }) => {
        const currentMachine = machines[rowIndex];
        const currentSiteId = currentMachine?.site_id ?? "";
        return h(
          "div",
          { class: "flex items-center justify-center h-full w-full px-1" },
          [
            h(
              "select",
              {
                class:
                  "w-full bg-transparent border-0 text-xs font-semibold text-[var(--text-body)] focus:ring-0 focus:outline-none cursor-pointer py-1 px-1 rounded hover:bg-black/[0.04] transition-all",
                "data-row": String(rowIndex),
                "data-action": "select-site",
              },
              [
                h(
                  "option",
                  {
                    value: "",
                    selected: !currentSiteId ? "selected" : undefined,
                  },
                  "No Site",
                ),
                ...sites.map((s) =>
                  h(
                    "option",
                    {
                      value: s.id,
                      selected: s.id === currentSiteId ? "selected" : undefined,
                    },
                    s.name,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    },
    {
      prop: "materialType",
      name: "Material",
      size: materialColSize,
      pin: "colPinStart" as const,
      sortable: false,
      readonly: true,
      cellTemplate: (
        h: any,
        { rowIndex, model }: { rowIndex: number; model: any },
      ) => {
        const value = model?.materialType ?? "Waste";
        const isCoal = value === "Coal";
        return h(
          "div",
          { class: "flex items-center justify-center h-full w-full px-1" },
          [
            h(
              "button",
              {
                class: `px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-150 cursor-pointer ${
                  isCoal
                    ? "bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f] hover:bg-[#3a3a3c]"
                    : "bg-[#f5f5f7] text-[#6e6e73] border-black/[0.08] hover:bg-[#e8e8ed]"
                }`,
                "data-row": String(rowIndex),
                "data-action": "toggle-material",
                title: "Click to toggle between Waste and Coal",
              },
              value,
            ),
          ],
        );
      },
    },
    ...HOURS_12.map((_, index) => {
      const hourProp = `hour_${(index + 1).toString().padStart(2, "0")}`;
      return {
        prop: hourProp,
        name: `${hourLabels[index]}:00`,
        size: hourColSize,
        sortable: false,
        cellTemplate: (
          h: any,
          { rowIndex, model }: { rowIndex: number; model: any },
        ) => {
          const value = model?.[hourProp] ?? 0;
          const isMax = value >= 100;
          const isMin = value <= 0;
          return h(
            "div",
            { class: "flex items-center justify-between px-1 gap-1 h-full" },
            [
              h("span", { class: "text-sm font-medium" }, value),
              h("div", { class: "flex flex-col" }, [
                h(
                  "button",
                  {
                    class:
                      "hour-btn-up p-0 leading-none hover:text-[var(--accent-blue)] text-[var(--text-muted)] transition-colors",
                    "data-row": String(rowIndex),
                    "data-hour": hourProp,
                    "data-action": "up",
                    disabled: isMax,
                    style: isMax
                      ? { opacity: "0.3", cursor: "not-allowed" }
                      : undefined,
                  },
                  h(
                    "svg",
                    {
                      xmlns: "http://www.w3.org/2000/svg",
                      width: "10",
                      height: "10",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "3",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                    },
                    h("path", { d: "m18 15-6-6-6 6" }),
                  ),
                ),
                h(
                  "button",
                  {
                    class:
                      "hour-btn-down p-0 leading-none hover:text-[var(--accent-blue)] text-[var(--text-muted)] transition-colors",
                    "data-row": String(rowIndex),
                    "data-hour": hourProp,
                    "data-action": "down",
                    disabled: isMin,
                    style: isMin
                      ? { opacity: "0.3", cursor: "not-allowed" }
                      : undefined,
                  },
                  h(
                    "svg",
                    {
                      xmlns: "http://www.w3.org/2000/svg",
                      width: "10",
                      height: "10",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "3",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                    },
                    h("path", { d: "m6 9 6 6 6-6" }),
                  ),
                ),
              ]),
            ],
          );
        },
      };
    }),
    {
      prop: "total",
      name: "Total",
      size: totalColSize,
      readonly: true,
    },
  ];

  if (hasBinFactors) {
    cols.push({
      prop: "binFactor",
      name: "Bin Factor",
      size: binFactorColSize,
      readonly: true,
    });
    cols.push({
      prop: "totalMaterial",
      name: "Total Material (t)",
      size: totalMaterialColSize,
      readonly: true,
    });
  }

  return cols;
}

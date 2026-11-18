import { describe, expect, it } from "vitest";
import { getTechnicalImageReadingNote } from "../technical-images";

describe("technical image reading notes", () => {
  it.each([
    "Test aperture and MTF calculation method are not specified.",
    "Focal length, test aperture and MTF calculation method are not stated for these charts.",
    "测试光圈及MTF计算方式未注明。",
    "这组图表未单列焦段、测试光圈和 MTF 计算方式。",
    "这张光学结构图未单独注明适用卡口。",
  ])("omits missing-only notes: %s", (note) => {
    expect(getTechnicalImageReadingNote(note)).toBeUndefined();
  });

  it.each([
    ["Test aperture is not specified. Some axis labels are clipped in the original chart.", "Some axis labels are clipped in the original chart."],
    ["测试光圈未注明；原始图表的部分轴标题被截断。", "原始图表的部分轴标题被截断。"],
    ["At 1:1 magnification. Test aperture and MTF calculation method are not specified.", "At 1:1 magnification."],
    ["横轴为以度表示的视场角；未注明测试光圈。", "横轴为以度表示的视场角。"],
    ["The legend labels 10 lp and 30 lp without a per-length unit.", "The legend labels 10 lp and 30 lp without a per-length unit."],
    ["Spatial-frequency units and MTF calculation method are not specified.", "Spatial-frequency units and MTF calculation method are not specified."],
    ["首行图例写 F12.2，其他行写 F2.2/F8；频率单位未注明。", "首行图例写 F12.2，其他行写 F2.2/F8；频率单位未注明。"],
  ])("retains reading guidance: %s", (note, expected) => {
    expect(getTechnicalImageReadingNote(note)).toBe(expected);
  });
});

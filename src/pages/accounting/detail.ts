import Taro, { useDidShow, useRouter } from "@tarojs/taro";

import { computed, nextTick, ref } from "vue";

import {
  getStoreAccountDetail,
  listDictDataByTypeCode,
  type DictData,
  type StoreAccount,
} from "../../services/api";

import { useAuthStore } from "../../stores/auth";
import LucideIcon from "../../components/LucideIcon.vue";

import { formatDateTime } from "../../shared/format";

export default {
  components: { LucideIcon },
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const id = Number(router.params?.id || 0);
    const detail = ref<StoreAccount | null>(null);
    const channelDict = ref<Record<string, string>>({});
    const sharing = ref(false);

    const operatorName = computed(() => {
      const operator = detail.value?.operator;
      return operator?.nickname || operator?.username || operator?.phone || "-";
    });

    const displayTotalAmount = computed(() => {
      const item = detail.value;
      if (!item) return 0;
      return item.gross_total_amount ?? item.total_amount ?? item.amount;
    });

    const itemCostAmount = computed(() => {
      return (detail.value?.items || []).reduce((sum, item: any) => {
        const direct = Number(item.cost_amount ?? item.cost_total ?? 0);
        if (direct > 0) return sum + direct;
        const unitCost = Number(item.cost_price ?? item.unit_cost ?? 0);
        const qty = Number(item.quantity || 0);
        return sum + unitCost * qty;
      }, 0);
    });

    const giftWineText = computed(() => {
      const item = detail.value;
      if (Number(item?.is_gift_wine || 0) !== 1) return "否";
      const name =
        String(item?.gift_wine_product_name || "").trim() ||
        (item?.gift_wine_product_id
          ? `商品 #${item.gift_wine_product_id}`
          : "赠酒商品");
      return `${name} ${formatQty(item?.gift_wine_quantity)} ${item?.gift_wine_unit || ""}`.trim();
    });

    const paymentStatusLabel = computed(() => {
      if (Number(detail.value?.payment_status) === 1) return "已完成";
      return Number(detail.value?.payment_status) === 2 ? "待结账" : "处理中";
    });

    function formatMoney(v: any) {
      const n = Number(v || 0);
      return Number.isFinite(n) ? n.toFixed(2) : "0.00";
    }

    function formatQty(v: any) {
      const n = Number(v || 0);
      if (!Number.isFinite(n)) return "--";
      return Number.isInteger(n) ? String(n) : n.toFixed(2);
    }

    function formatDate(v?: string) {
      if (!v) return "-";
      return String(v).slice(0, 10);
    }

    async function shareBill() {
      if (!detail.value || sharing.value) return;

      sharing.value = true;

      try {
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 80));

        const query = Taro.createSelectorQuery();

        const canvasInfo = await new Promise<any>((resolve, reject) => {
          query
            .select("#shareCanvas")
            .fields({ node: true, size: true })
            .exec((result: any[]) => {
              const info = result?.[0];

              if (!info?.node) {
                reject(new Error("账单图片生成失败"));
                return;
              }

              resolve(info);
            });
        });

        const canvas = canvasInfo.node;

        // ==============================
        // 基础参数
        // ==============================

        const width = 750;
        const dpr = Number(Taro.getSystemInfoSync().pixelRatio || 2);

        const items = detail.value.items || [];
        const memberAccount =
          detail.value.member?.phone || detail.value.member?.uid || "-";
        const billOperator =
          detail.value.operator?.nickname ||
          detail.value.operator?.username ||
          detail.value.operator?.phone ||
          detail.value.operator_name ||
          detail.value.operator_phone ||
          "-";
        const operationTime = formatDateTime(detail.value.created_at);

        // 每个商品占用高度
        const itemHeight = 118;

        // 商品区域高度
        const goodsHeight = Math.max(180, 88 + items.length * itemHeight);

        // 顶部 + 商品 + 底部
        const height =
          190 + // 顶部品牌区域
          298 + // 账单信息
          goodsHeight +
          170; // 底部

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d");

        ctx.scale(dpr, dpr);

        // ==============================
        // 颜色
        // ==============================

        const PAPER = "#FDFBF7";
        const PAPER_DARK = "#F7F3EC";
        const TEXT = "#1F2933";
        const TEXT_SECONDARY = "#6B7280";
        const TEXT_LIGHT = "#9CA3AF";
        const LINE = "#E8E2D8";
        const PRICE = "#111827";

        // ==============================
        // 背景
        // ==============================

        ctx.fillStyle = "#EEF1F4";
        ctx.fillRect(0, 0, width, height);

        // 纸张
        ctx.fillStyle = PAPER;
        ctx.fillRect(24, 20, width - 48, height - 40);

        // ==============================
        // 辅助函数
        // ==============================

        const drawLine = (
          x1: number,
          y1: number,
          x2: number,
          y2: number,
          color = LINE,
          lineWidth = 1,
        ) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        };

        const drawText = (
          text: string,
          x: number,
          y: number,
          size: number,
          color = TEXT,
          weight = "normal",
          align: CanvasTextAlign = "left",
        ) => {
          ctx.fillStyle = color;
          ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`;
          ctx.textAlign = align;
          ctx.textBaseline = "middle";
          ctx.fillText(String(text), x, y);
        };

        const drawRoundRect = (
          x: number,
          y: number,
          w: number,
          h: number,
          r: number,
          fill: string,
        ) => {
          ctx.fillStyle = fill;
          ctx.beginPath();

          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);

          ctx.closePath();
          ctx.fill();
        };

        // ==============================
        // 顶部：品牌 / 消费账单
        // ==============================

        let y = 72;

        drawText("消费账单", width / 2, y, 30, TEXT, "bold", "center");

        y += 42;

        drawText(
          detail.value.store?.name || "感谢您的消费",
          width / 2,
          y,
          20,
          TEXT_SECONDARY,
          "normal",
          "center",
        );

        // 装饰线
        y += 42;

        drawLine(62, y, width - 62, y, LINE, 1);

        // ==============================
        // 账单信息
        // ==============================

        y += 42;

        drawText("账单编号", 64, y, 17, TEXT_LIGHT);

        drawText(
          detail.value.account_no || detail.value.order_no || `JZ${id}`,
          64,
          y + 28,
          20,
          TEXT,
          "bold",
        );

        drawText("消费日期", width - 64, y, 17, TEXT_LIGHT, "normal", "right");

        drawText(
          formatDate(detail.value.account_date || detail.value.created_at),
          width - 64,
          y + 28,
          20,
          TEXT,
          "bold",
          "right",
        );

        // 会员及操作信息
        y += 74;

        drawText(`会员账号：${memberAccount}`, 64, y + 14, 19, TEXT, "bold");

        drawText(
          `操作人：${billOperator}`,
          width - 64,
          y + 14,
          19,
          TEXT,
          "bold",
          "right",
        );

        y += 74;

        drawText(`操作时间：${operationTime}`, 64, y + 14, 18, TEXT, "bold");

        // ==============================
        // 金额区域
        // ==============================

        y += 92;

        drawRoundRect(58, y, width - 116, 112, 8, PAPER_DARK);

        drawText("本次消费合计", 84, y + 34, 18, TEXT_SECONDARY);

        drawText(
          `¥ ${formatMoney(displayTotalAmount.value)}`,
          84,
          y + 76,
          42,
          PRICE,
          "bold",
        );

        // ==============================
        // 商品明细
        // ==============================

        y += 154;

        drawText("商品明细", 64, y, 24, TEXT, "bold");

        drawText(
          `${items.length} 项`,
          width - 64,
          y,
          17,
          TEXT_LIGHT,
          "normal",
          "right",
        );

        y += 38;

        drawLine(64, y, width - 64, y, LINE);

        // 表头
        y += 32;

        drawText("商品", 64, y, 16, TEXT_LIGHT);

        drawText("数量", 500, y, 16, TEXT_LIGHT, "normal", "right");

        drawText("金额", width - 64, y, 16, TEXT_LIGHT, "normal", "right");

        y += 30;

        // ==============================
        // 商品列表
        // ==============================

        items.forEach((item: any, index: number) => {
          const productName = item.product_name || `商品 #${item.product_id}`;

          const quantity = formatQty(item.quantity);

          const unit = item.unit || "";

          const amount = `¥ ${formatMoney(item.amount)}`;

          // 商品名称
          drawText(productName, 64, y, 21, TEXT, "bold");

          // 数量
          drawText(
            `${quantity}${unit}`,
            500,
            y,
            19,
            TEXT_SECONDARY,
            "normal",
            "right",
          );

          // 金额
          drawText(amount, width - 64, y, 21, PRICE, "bold", "right");

          // 单价
          if (item.price != null) {
            drawText(
              `单价 ¥${formatMoney(item.price)}`,
              64,
              y + 30,
              16,
              TEXT_LIGHT,
            );
          }

          y += 76;

          if (index < items.length - 1) {
            drawLine(64, y - 18, width - 64, y - 18, LINE);
          }
        });

        // ==============================
        // 合计
        // ==============================

        y += 8;

        drawLine(64, y, width - 64, y, LINE, 1);

        y += 46;

        drawText("合计", 64, y, 19, TEXT_SECONDARY);

        drawText(
          `¥ ${formatMoney(displayTotalAmount.value)}`,
          width - 64,
          y,
          28,
          PRICE,
          "bold",
          "right",
        );

        // ==============================
        // 底部
        // ==============================

        y += 82;

        drawLine(64, y, width - 64, y, LINE);

        y += 40;

        drawText("感谢您的光临", width / 2, y, 20, TEXT, "bold", "center");

        y += 32;

        drawText(
          "本账单仅供消费核对使用",
          width / 2,
          y,
          15,
          TEXT_LIGHT,
          "normal",
          "center",
        );

        // ==============================
        // 底部小装饰
        // ==============================

        y += 36;

        drawText("· · ·", width / 2, y, 18, TEXT_LIGHT, "normal", "center");

        // ==============================
        // 生成图片
        // ==============================

        const path = await new Promise<string>((resolve, reject) => {
          Taro.canvasToTempFilePath({
            canvas,
            x: 0,
            y: 0,
            width,
            height,
            destWidth: width * 2,
            destHeight: height * 2,

            success: (result: any) => {
              resolve(result.tempFilePath);
            },

            fail: reject,
          } as any);
        });

        // ==============================
        // 保存到相册
        // ==============================

        await Taro.saveImageToPhotosAlbum({
          filePath: path,
        });

        Taro.showToast({
          title: "账单图片已保存",
          icon: "success",
        });
      } catch (error: any) {
        if (String(error?.errMsg || "").includes("auth deny")) {
          Taro.showModal({
            title: "需要相册权限",
            content: "请允许保存图片到手机相册",
            confirmText: "去设置",

            success: (result) => {
              if (result.confirm) {
                Taro.openSetting();
              }
            },
          });
        } else {
          Taro.showToast({
            title: error?.message || "账单图片生成失败",
            icon: "none",
          });
        }
      } finally {
        sharing.value = false;
      }
    }

    function againAccount() {
      Taro.navigateTo({ url: "/pages/accounting/create" });
    }

    function mapDict(rows: DictData[]) {
      const map: Record<string, string> = {};
      rows.forEach((r) => {
        const value = String(r?.value || "").trim();
        if (!value) return;
        map[value] = String(r?.label || r?.value || "").trim() || value;
      });
      return map;
    }

    function channelLabel(channel?: string) {
      const code = String(channel || "").trim();
      if (!code) return "-";
      return channelDict.value[code] || code;
    }

    async function loadChannelDict() {
      if (!auth.token) return;
      try {
        const rows = await listDictDataByTypeCode(auth.token, "sales_channel");
        channelDict.value = mapDict(rows);
      } catch {
        channelDict.value = {};
      }
    }

    async function refresh() {
      if (!auth.token || !id) return;
      try {
        const data = await getStoreAccountDetail(auth.token, id);
        detail.value = data;
      } catch (err: any) {
        Taro.showToast({ title: err?.message || "加载失败", icon: "none" });
      }
    }

    useDidShow(() => {
      void Promise.all([refresh(), loadChannelDict()]);
    });

    return {
      Taro,
      useDidShow,
      useRouter,
      computed,
      ref,
      getStoreAccountDetail,
      listDictDataByTypeCode,
      useAuthStore,
      auth,
      router,
      id,
      detail,
      channelDict,
      sharing,
      operatorName,
      displayTotalAmount,
      itemCostAmount,
      giftWineText,
      paymentStatusLabel,
      formatMoney,
      formatQty,
      formatDate,
      formatDateTime,
      mapDict,
      channelLabel,
      loadChannelDict,
      refresh,
      shareBill,
      againAccount,
    };
  },
};

import Taro, { useDidShow, useRouter, nextTick } from "@tarojs/taro";

import { computed, ref } from "vue";

import {
  getMemberUnsettledAccounts,
  type MemberUnsettledAccountGroup,
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

    const memberId = Number(router.params?.member_id || 0);

    // ==========================================
    // 状态
    // ==========================================

    const member = ref<MemberUnsettledAccountGroup | null>(null);

    const loading = ref(false);

    const sharing = ref(false);

    // ==========================================
    // 计算属性
    // ==========================================

    const accounts = computed(() => {
      return member.value?.unsettled_accounts || [];
    });

    const totalAmount = computed(() => {
      return accounts.value.reduce((sum, account) => {
        return sum + accountAmount(account);
      }, 0);
    });

    const totalItemCount = computed(() => {
      return accounts.value.reduce((sum, account) => {
        return sum + (account.items?.length || 0);
      }, 0);
    });

    // ==========================================
    // 金额
    // ==========================================

    function accountAmount(account: StoreAccount) {
      return Number(
        account.gross_total_amount ??
          account.total_amount ??
          account.amount ??
          0,
      );
    }

    function itemAmount(item: NonNullable<StoreAccount["items"]>[number]) {
      const amount = Number(item.amount);

      if (Number.isFinite(amount) && amount !== 0) {
        return amount;
      }

      return Number(item.price || 0) * Number(item.quantity || 0);
    }

    function formatMoney(value: unknown) {
      const amount = Number(value || 0);

      return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    }

    function formatQuantity(value: unknown) {
      const amount = Number(value);

      if (!Number.isFinite(amount)) {
        return "0";
      }

      return Number.isInteger(amount)
        ? String(amount)
        : amount.toFixed(2).replace(/\.?0+$/, "");
    }

    // ==========================================
    // 账单标题
    // ==========================================

    function getBillTitle(account: StoreAccount) {
      if (account.title) {
        return account.title;
      }

      if (account.account_no) {
        return `消费账单 · ${account.account_no}`;
      }

      return `消费账单 #${account.id}`;
    }

    // ==========================================
    // 日期
    // ==========================================

    function parseBillDate(value: unknown) {
      if (!value) {
        return null;
      }

      const text = String(value).trim();

      // Date-only and timezone-less API values represent local store time.
      const localParts = text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
      );
      if (localParts) {
        return new Date(
          Number(localParts[1]),
          Number(localParts[2]) - 1,
          Number(localParts[3]),
          Number(localParts[4] || 0),
          Number(localParts[5] || 0),
          Number(localParts[6] || 0),
        );
      }

      let date = new Date(text);

      if (Number.isNaN(date.getTime())) {
        date = new Date(text.replace(/-/g, "/"));
      }

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date;
    }

    function formatBillDate(value: unknown) {
      const date = parseBillDate(value);

      if (!date) {
        return "-";
      }

      const month = String(date.getMonth() + 1).padStart(2, "0");

      const day = String(date.getDate()).padStart(2, "0");

      return `${month}.${day}`;
    }

    function formatBillTime(value: unknown) {
      const date = parseBillDate(value);

      if (!date) {
        return "";
      }

      const hour = String(date.getHours()).padStart(2, "0");

      const minute = String(date.getMinutes()).padStart(2, "0");

      return `${hour}:${minute}`;
    }

    function formatFullBillDate(value: unknown) {
      const date = parseBillDate(value);

      if (!date) {
        return "";
      }

      const year = date.getFullYear();

      const month = String(date.getMonth() + 1).padStart(2, "0");

      const day = String(date.getDate()).padStart(2, "0");

      const hour = String(date.getHours()).padStart(2, "0");

      const minute = String(date.getMinutes()).padStart(2, "0");

      return `${year}.${month}.${day} ${hour}:${minute}`;
    }

    // 保留原页面使用
    function formatDateTimeSafe(value: unknown) {
      if (!value) {
        return "-";
      }

      return formatDateTime(value as any);
    }

    // ==========================================
    // 加载数据
    // ==========================================

    async function refresh() {
      if (!auth.token) {
        return;
      }

      loading.value = true;

      try {
        if (!memberId) {
          member.value = null;
          return;
        }

        const groups = await getMemberUnsettledAccounts(auth.token, {
          store_id: auth.storeId || undefined,

          member_id: memberId,
        });

        member.value =
          groups.find((item) => Number(item.id) === memberId) ||
          groups[0] ||
          null;
      } catch (err: any) {
        Taro.showToast({
          title: err?.message || "加载账单失败",

          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    }

    // ==========================================
    // Canvas：文字
    // ==========================================

    function drawText(
      ctx: any,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      color: string,
      fontWeight = "normal",
    ) {
      ctx.font = `${fontWeight} ${fontSize}px sans-serif`;

      ctx.fillStyle = color;

      ctx.textBaseline = "alphabetic";

      ctx.fillText(String(text ?? ""), x, y);
    }

    // ==========================================
    // Canvas：圆角矩形
    // ==========================================

    function drawRoundRect(
      ctx: any,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
      fillStyle: string,
    ) {
      ctx.beginPath();

      ctx.moveTo(x + radius, y);

      ctx.lineTo(x + width - radius, y);

      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);

      ctx.lineTo(x + width, y + height - radius);

      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );

      ctx.lineTo(x + radius, y + height);

      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);

      ctx.lineTo(x, y + radius);

      ctx.quadraticCurveTo(x, y, x + radius, y);

      ctx.closePath();

      ctx.fillStyle = fillStyle;

      ctx.fill();
    }

    // ==========================================
    // Canvas：分割线
    // ==========================================

    function drawLine(
      ctx: any,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color = "#E8EDF2",
    ) {
      ctx.strokeStyle = color;

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.moveTo(x1, y1);

      ctx.lineTo(x2, y2);

      ctx.stroke();
    }

    // ==========================================
    // Canvas：生成客户账单
    // ==========================================

    async function shareBills() {
      if (!member.value || !accounts.value.length || sharing.value) {
        return;
      }

      sharing.value = true;

      try {
        // 等待页面渲染
        await new Promise<void>((resolve) => {
          Taro.nextTick(resolve);
        });

        await new Promise<void>((resolve) => {
          setTimeout(resolve, 120);
        });

        // ======================================
        // 获取 Canvas
        // ======================================

        const query = Taro.createSelectorQuery();

        const canvasInfo = await new Promise<any>((resolve, reject) => {
          query
            .select("#billShareCanvas")
            .fields({
              node: true,
              size: true,
            })
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

        // ======================================
        // Canvas 尺寸
        // ======================================

        const width = 750;

        const headerHeight = 390;

        const billHeaderHeight = 170;

        const productHeight = 90;

        const billFooterHeight = 72;

        const billGap = 24;

        const summaryHeight = 245;

        let height = headerHeight;

        accounts.value.forEach((account) => {
          const itemCount = Math.max(account.items?.length || 0, 1);

          height +=
            billHeaderHeight +
            itemCount * productHeight +
            billFooterHeight +
            billGap;
        });

        height += summaryHeight;

        const dpr = Number(Taro.getSystemInfoSync().pixelRatio || 2);

        canvas.width = width * dpr;

        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d");

        ctx.scale(dpr, dpr);

        // ======================================
        // 背景
        // ======================================

        ctx.fillStyle = "#F3F5F7";

        ctx.fillRect(0, 0, width, height);

        // ======================================
        // 顶部账单
        // ======================================

        drawRoundRect(ctx, 32, 32, width - 64, 326, 20, "#FFFFFF");

        // 顶部小标题

        drawText(ctx, "消费账单", 64, 82, 22, "#7B8798", "bold");

        // 客户名称

        const customerName =
          member.value.name || member.value.phone || `会员 #${member.value.id}`;

        drawText(ctx, customerName, 64, 135, 36, "#17202A", "bold");

        // 手机号

        if (member.value.phone) {
          drawText(ctx, member.value.phone, 64, 169, 20, "#8A96A8");
        }

        // 金额标签

        drawText(ctx, "待结账金额", 64, 220, 20, "#7B8798", "bold");

        // 总金额

        drawText(
          ctx,
          `¥ ${formatMoney(totalAmount.value)}`,
          64,
          280,
          52,
          "#C85B16",
          "bold",
        );

        // 消费笔数

        drawText(
          ctx,
          `共 ${accounts.value.length} 笔消费`,
          64,
          320,
          19,
          "#8A96A8",
        );

        // ======================================
        // 账单列表
        // ======================================

        let y = headerHeight;

        accounts.value.forEach((account, accountIndex) => {
          const items = account.items || [];

          const itemCount = Math.max(items.length, 1);

          const billHeight =
            billHeaderHeight + itemCount * productHeight + billFooterHeight;

          // =================================
          // 卡片
          // =================================

          drawRoundRect(ctx, 32, y, width - 64, billHeight, 18, "#FFFFFF");

          // =================================
          // 日期
          // =================================

          const billDate = account.account_date || account.created_at;

          drawText(
            ctx,
            formatBillDate(billDate),
            64,
            y + 54,
            30,
            "#17202A",
            "bold",
          );

          drawText(
            ctx,
            formatBillTime(billDate),
            64,
            y + 88,
            21,
            "#287FE5",
            "bold",
          );

          // 编号

          drawText(
            ctx,
            `NO.${String(accountIndex + 1).padStart(2, "0")}`,
            590,
            y + 54,
            18,
            "#A0AAB8",
            "bold",
          );

          // 单笔金额

          drawText(
            ctx,
            `¥ ${formatMoney(accountAmount(account))}`,
            490,
            y + 99,
            25,
            "#C85B16",
            "bold",
          );

          // =================================
          // 分割线
          // =================================

          drawLine(ctx, 64, y + 124, 686, y + 124);

          // =================================
          // 商品
          // =================================

          let productY = y + 169;

          if (!items.length) {
            drawText(ctx, "暂无商品明细", 64, productY, 19, "#8A96A8");
          } else {
            items.forEach((item, itemIndex) => {
              const productName =
                item.product_name || `商品 #${item.product_id || "-"}`;

              const quantity = `${formatQuantity(item.quantity)} ${
                item.unit || "项"
              }`;

              // 商品名称

              drawText(ctx, productName, 64, productY, 21, "#17202A", "bold");

              // 数量 / 规格

              let productDesc = quantity;

              if (item.spec) {
                productDesc += ` · ${item.spec}`;
              }

              drawText(ctx, productDesc, 64, productY + 30, 18, "#7B8798");

              // 商品金额

              drawText(
                ctx,
                `¥ ${formatMoney(itemAmount(item))}`,
                560,
                productY + 7,
                20,
                "#273342",
                "bold",
              );

              productY += productHeight;

              // 商品分割线

              if (itemIndex < items.length - 1) {
                drawLine(ctx, 64, productY - 25, 686, productY - 25, "#F0F2F5");
              }
            });
          }

          // =================================
          // 底部
          // =================================

          const footerY = y + billHeight - billFooterHeight;

          drawLine(ctx, 64, footerY, 686, footerY);

          drawText(
            ctx,
            `共 ${items.length} 项商品`,
            64,
            footerY + 45,
            18,
            "#8A96A8",
          );

          drawText(ctx, "未结账", 620, footerY + 45, 18, "#C85B16", "bold");

          y += billHeight + billGap;
        });

        // ======================================
        // 底部总计
        // ======================================

        drawRoundRect(ctx, 32, y, width - 64, 220, 20, "#17202A");

        drawText(ctx, "全部未结账单", 64, y + 55, 21, "#AEB8C5", "bold");

        drawText(
          ctx,
          `¥ ${formatMoney(totalAmount.value)}`,
          64,
          y + 118,
          48,
          "#FFFFFF",
          "bold",
        );

        drawText(
          ctx,
          `共 ${accounts.value.length} 笔消费 · ${totalItemCount.value} 项商品`,
          64,
          y + 168,
          18,
          "#AEB8C5",
        );

        // ======================================
        // Canvas 转图片
        // ======================================

        const path = await new Promise<string>((resolve, reject) => {
          Taro.canvasToTempFilePath({
            canvas,

            x: 0,

            y: 0,

            width,

            height,

            destWidth: width * 2,

            destHeight: height * 2,

            success(result: any) {
              resolve(result.tempFilePath);
            },

            fail(error) {
              reject(error);
            },
          } as any);
        });

        // ======================================
        // 保存到相册
        // ======================================

        await Taro.saveImageToPhotosAlbum({
          filePath: path,
        });

        Taro.showToast({
          title: "账单已生成",
          icon: "success",
        });
      } catch (error: any) {
        const message = String(error?.errMsg || "");

        // ======================================
        // 相册权限
        // ======================================

        if (message.includes("auth deny") || message.includes("authorize")) {
          Taro.showModal({
            title: "需要相册权限",

            content: "请允许保存账单图片到手机相册",

            confirmText: "去设置",

            success(result) {
              if (result.confirm) {
                Taro.openSetting();
              }
            },
          });
        } else {
          Taro.showToast({
            title: error?.message || "账单生成失败",

            icon: "none",
          });
        }
      } finally {
        sharing.value = false;
      }
    }

    // ==========================================
    // 页面显示
    // ==========================================

    useDidShow(() => {
      void refresh();
    });

    // ==========================================
    // 返回
    // ==========================================

    return {
      member,

      accounts,

      loading,

      sharing,

      totalAmount,

      totalItemCount,

      accountAmount,

      itemAmount,

      formatMoney,

      formatQuantity,

      formatDateTime: formatDateTimeSafe,

      formatBillDate,

      formatBillTime,

      formatFullBillDate,

      getBillTitle,

      shareBills,

      refresh,
    };
  },
};

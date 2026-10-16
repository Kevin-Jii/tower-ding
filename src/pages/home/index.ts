import Taro, { useDidShow, usePullDownRefresh } from "@tarojs/taro";

import { computed, reactive, ref } from "vue";

import LucideIcon from "../../components/LucideIcon.vue";
import RememberedAccountsSheet from "../../components/RememberedAccountsSheet.vue";

import {
  getStoreAccountStats,
  listAllInventories,
  listStoreAccounts,
  listStoreReturns,
  updateUserProfile,
  type StoreAccount,
  type StoreReturn,
} from "../../services/api";

import { useAuthStore } from "../../stores/auth";
import { formatMoney } from "../../shared/format";
import {
  readRememberedLogins,
  rememberLogin,
  type RememberedLogin,
} from "../../shared/login-accounts";

import type { LucideIconName } from "../../utils/lucide-icons";

type HomeAction = {
  title: string;
  icon: LucideIconName;
  tone: string;
  color: string;
  url: string;
};

type HomeTodo = {
  text: string;
  icon: LucideIconName;
  tone: string;
  color: string;
  url: string;
};

export default {
  components: { LucideIcon, RememberedAccountsSheet },
  setup() {
    const auth = useAuthStore();

    const today = businessDateStr();

    const todayAmount = ref(0);

    const totalTurnoverAmount = ref(0);

    const unpaidCount = ref(0);

    const lowStockCount = ref(0);

    const pendingReturnCount = ref(0);

    const accountSheetOpen = ref(false);

    const switchingAccount = ref(false);

    const rememberedAccounts = ref<RememberedLogin[]>([]);

    const userMenuOpen = ref(false);

    const profileEditorOpen = ref(false);

    const savingProfile = ref(false);

    const profileForm = reactive({
      nickname: "",
      password: "",
      confirmPassword: "",
    });

    const menuButtonRect = (() => {
      try {
        return Taro.getMenuButtonBoundingClientRect();
      } catch {
        return null;
      }
    })();

    const systemInfo = (() => {
      try {
        return Taro.getSystemInfoSync();
      } catch {
        return null;
      }
    })();

    const heroStyle = computed(() => {
      const statusBarHeight = Number(systemInfo?.statusBarHeight || 20);
      const menuTop = Number(menuButtonRect?.top || statusBarHeight + 7);
      const rightInset = menuButtonRect
        ? Math.max(
            Number(systemInfo?.windowWidth || 375) -
              Number(menuButtonRect.left || 0) +
              12,
            96,
          )
        : 108;
      return {
        paddingTop: `${Math.max(statusBarHeight + 6, menuTop)}px`,
        paddingRight: `${rightInset}px`,
      };
    });

    const notificationStyle = computed(() => ({
      top: `${Number(menuButtonRect?.top || Number(systemInfo?.statusBarHeight || 20) + 7)}px`,
      right: menuButtonRect
        ? `${Math.max(Number(systemInfo?.windowWidth || 375) - Number(menuButtonRect.left || 0) + 8, 94)}px`
        : "98px",
    }));

    const userMenuStyle = computed(() => ({
      top: `${Math.max(
        Number(systemInfo?.statusBarHeight || 20) + 52,
        Number(menuButtonRect?.bottom || 59) + 10,
      )}px`,
    }));

    const userName = computed(
      () => auth.user?.nickname || auth.user?.username || "井科伟",
    );

    const initials = computed(() => {
      const text =
        auth.user?.nickname || auth.user?.username || auth.user?.phone || "井";
      return String(text).slice(0, 1).toUpperCase();
    });

    const greeting = computed(() => {
      const h = new Date().getHours();
      if (h < 11) return "早上好";
      if (h < 18) return "下午好";
      return "晚上好";
    });

    const maskedCurrentPhone = computed(() => {
      const phone = String(auth.user?.phone || "");
      if (phone.length < 7) return phone || "未绑定手机号";
      return `${phone.slice(0, 3)} **** ${phone.slice(-4)}`;
    });

    const rememberedAccountHint = computed(() => {
      const count = rememberedAccounts.value.length;
      return count > 0 ? `${count} 个已记住账号` : "添加或登录其他账号";
    });

    const hasNotification = computed(
      () =>
        unpaidCount.value > 0 ||
        lowStockCount.value > 0 ||
        pendingReturnCount.value > 0,
    );

    const quickActions: HomeAction[] = [
      {
        title: "会员存酒",
        icon: "bottle-wine",
        tone: "sky",
        color: "#2f80ed",
        url: "/pages/member-wine/index",
      },
      {
        title: "快速记账",
        icon: "wallet-cards",
        tone: "blue",
        color: "#287fe5",
        url: "/pages/accounting/create?mode=quick",
      },
      {
        title: "库存查询",
        icon: "package-search",
        tone: "violet",
        color: "#6b5cff",
        url: "/pages/inventory/stock-list",
      },
      {
        title: "入库出库",
        icon: "arrow-down-up",
        tone: "cyan",
        color: "#2f80ed",
        url: "/pages/inventory/form",
      },
    ];

    const businessActions: HomeAction[] = [
      {
        title: "会员管理",
        icon: "users-round",
        tone: "indigo",
        color: "#3f7df4",
        url: "/pages/member/index",
      },
      {
        title: "B2B供货",
        icon: "warehouse",
        tone: "green",
        color: "#35a853",
        url: "/pages/b2b/supply-orders",
      },
      {
        title: "门店返厂",
        icon: "shopping-bag",
        tone: "orange",
        color: "#ff8b2c",
        url: "/pages/store-return/index",
      },
      {
        title: "报损自用",
        icon: "wallet",
        tone: "purple",
        color: "#7c5ce8",
        url: "/pages/inventory-loss/index",
      },
      {
        title: "入库记录",
        icon: "file-text",
        tone: "sky",
        color: "#2f80ed",
        url: "/pages/inventory/orders?type=in",
      },
      {
        title: "出库记录",
        icon: "receipt-text",
        tone: "purple",
        color: "#7c5ce8",
        url: "/pages/inventory/orders?type=out",
      },
      {
        title: "门店支出",
        icon: "wallet",
        tone: "blue",
        color: "#287fe5",
        url: "/pages/store-expense/index",
      },
      {
        title: "补记账单",
        icon: "receipt-text",
        tone: "purple",
        color: "#7c5ce8",
        url: "/pages/accounting/create?mode=supplement",
      },
      {
        title: "库存盘点",
        icon: "package-search",
        tone: "violet",
        color: "#6b5cff",
        url: "/pages/inventory/index",
      },
    ];

    const businessPages = computed<HomeAction[][]>(() =>
      [businessActions.slice(0, 4), businessActions.slice(4)].filter(
        (page) => page.length > 0,
      ),
    );

    const businessPageIndex = ref(0);

    const businessSwiperStyle = computed(() => {
      const itemCount =
        businessPages.value[businessPageIndex.value]?.length || 0;
      const rows = Math.max(1, Math.ceil(itemCount / 4));
      return { height: `${rows * 82 + (rows - 1) * 24}px` };
    });

    const todos = computed<HomeTodo[]>(() => [
      {
        text:
          unpaidCount.value > 0
            ? `有 ${unpaidCount.value} 笔未支付账单`
            : "暂无未支付账单",
        icon: "file-text",
        tone: "blue",
        color: "#287fe5",
        url: "/pages/accounting/unpaid",
      },
      {
        text:
          lowStockCount.value > 0
            ? `有 ${lowStockCount.value} 个商品库存偏低`
            : "暂无库存预警",
        icon: "triangle-alert",
        tone: "orange",
        color: "#ff9d2d",
        url: "/pages/inventory/stock-list",
      },
      {
        text:
          pendingReturnCount.value > 0
            ? `今日有 ${pendingReturnCount.value} 条返厂记录`
            : "今日暂无返厂记录",
        icon: "clock",
        tone: "blue",
        color: "#287fe5",
        url: "/pages/store-return/index",
      },
    ]);

    function onBusinessPageChange(event: any) {
      businessPageIndex.value = Number(event?.detail?.current || 0);
    }

    function pad(n: number) {
      return n < 10 ? `0${n}` : `${n}`;
    }

    function businessDate() {
      const now = new Date();
      if (now.getHours() < 5) now.setDate(now.getDate() - 1);
      now.setHours(0, 0, 0, 0);
      return now;
    }

    function businessDateStr() {
      const now = businessDate();
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    function isLowStock(row: any) {
      const qty = Number(row?.quantity || 0);
      return Number.isFinite(qty) && qty < 3;
    }

    function countUnpaid(rows: StoreAccount[]) {
      const orders = new Set<string>();
      rows.forEach((row) => {
        if (Number(row.payment_status || 1) !== 2 || row.is_canceled) return;

        const orderNo = String(row.order_no || "").trim();
        if (orderNo) {
          orders.add(`order:${orderNo}`);
          return;
        }
        if (row.source_type === "b2b_supply_order" && Number(row.source_id || 0) > 0) {
          orders.add(`b2b:${row.source_id}`);
          return;
        }
        orders.add(`account:${row.id}`);
      });
      return orders.size;
    }

    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      const storeID = auth.storeId || undefined;
      try {
        const [accountStats, unpaidRows, inventories, returnRows] =
          await Promise.all([
            getStoreAccountStats(auth.token, {
              store_id: storeID,
              start_date: today,
              end_date: today,
            }),
            listStoreAccounts(auth.token, {
              store_id: storeID,
              payment_status: 2,
              page: 1,
              page_size: 100,
            }),
            listAllInventories(auth.token, { store_id: storeID }),
            listStoreReturns(auth.token, {
              store_id: storeID,
              start_date: today,
              end_date: today,
              page: 1,
              page_size: 100,
            }),
          ]);
        todayAmount.value = Number(accountStats?.gross_total_amount || 0);
        totalTurnoverAmount.value = Number(
          accountStats?.total_turnover_amount || 0,
        );
        unpaidCount.value = countUnpaid(unpaidRows);
        lowStockCount.value = inventories.filter(isLowStock).length;
        pendingReturnCount.value = (returnRows as StoreReturn[]).length;
      } catch (err: any) {
        Taro.showToast({
          title: err?.message || "首页数据加载失败",
          icon: "none",
        });
      }
    }

    function go(url: string) {
      userMenuOpen.value = false;
      if (!auth.token) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      Taro.navigateTo({ url });
    }

    function syncRememberedAccounts() {
      rememberedAccounts.value = readRememberedLogins();
    }

    function toggleUserMenu() {
      if (!auth.token || switchingAccount.value) return;
      syncRememberedAccounts();
      userMenuOpen.value = !userMenuOpen.value;
    }

    function closeUserMenu() {
      userMenuOpen.value = false;
    }

    function openNotifications() {
      if (unpaidCount.value > 0) {
        go("/pages/accounting/unpaid");
        return;
      }
      if (lowStockCount.value > 0) {
        go("/pages/inventory/stock-list");
        return;
      }
      if (pendingReturnCount.value > 0) {
        go("/pages/store-return/index");
        return;
      }
      Taro.showToast({ title: "暂无待办提醒", icon: "none" });
    }

    function openAccountSheet() {
      if (!auth.token || switchingAccount.value) return;
      userMenuOpen.value = false;
      syncRememberedAccounts();
      accountSheetOpen.value = true;
    }

    function onAvatarLongPress() {
      openAccountSheet();
    }

    function openProfileEditor() {
      userMenuOpen.value = false;
      profileForm.nickname = String(auth.user?.nickname || "");
      profileForm.password = "";
      profileForm.confirmPassword = "";
      profileEditorOpen.value = true;
    }

    function closeProfileEditor() {
      if (savingProfile.value) return;
      profileEditorOpen.value = false;
    }

    function onProfileInput(
      field: "nickname" | "password" | "confirmPassword",
      event: any,
    ) {
      const value = String(event?.detail?.value || "");
      profileForm[field] = field === "nickname" ? value.trimStart() : value;
    }

    async function saveProfile() {
      if (!auth.token || savingProfile.value) return;
      const nickname = profileForm.nickname.trim();
      const password = profileForm.password;
      const confirmPassword = profileForm.confirmPassword;
      const oldNickname = String(auth.user?.nickname || "");
      const phone = String(auth.user?.phone || "");

      if (!nickname) {
        Taro.showToast({ title: "昵称不能为空", icon: "none" });
        return;
      }
      if (password && password.length < 6) {
        Taro.showToast({ title: "新密码至少 6 位", icon: "none" });
        return;
      }
      if (password !== confirmPassword) {
        Taro.showToast({ title: "两次输入的密码不一致", icon: "none" });
        return;
      }
      if (nickname === oldNickname && !password) {
        Taro.showToast({ title: "用户信息没有变化", icon: "none" });
        return;
      }

      savingProfile.value = true;
      Taro.showLoading({ title: "保存中" });
      try {
        await updateUserProfile(auth.token, {
          nickname,
          ...(password ? { password } : {}),
        });
        if (password && phone) {
          const remembered = readRememberedLogins().find(
            (item) => item.phone === phone,
          );
          if (remembered) rememberLogin(phone, password);
        }
        try {
          await auth.refreshProfile();
        } catch {
          if (auth.user) auth.user.nickname = nickname;
        }
        syncRememberedAccounts();
        profileEditorOpen.value = false;
        Taro.showToast({ title: "用户信息已更新", icon: "success" });
      } catch (err: any) {
        Taro.showToast({ title: err?.message || "保存失败", icon: "none" });
      } finally {
        Taro.hideLoading();
        savingProfile.value = false;
      }
    }

    function noopTouchMove() {}

    function closeAccountSheet() {
      if (switchingAccount.value) return;
      accountSheetOpen.value = false;
    }

    function onUseOtherAccount() {
      if (switchingAccount.value) return;
      accountSheetOpen.value = false;
      auth.logout();
      Taro.reLaunch({ url: "/pages/login/index" });
    }

    async function onSelectRememberedAccount(account: RememberedLogin) {
      if (switchingAccount.value) return;
      switchingAccount.value = true;
      Taro.showLoading({ title: "切换中" });
      try {
        await auth.login(account.phone, account.password);
        rememberLogin(account.phone, account.password);
        accountSheetOpen.value = false;
        Taro.reLaunch({ url: "/pages/home/index" });
      } catch (err: any) {
        Taro.showToast({ title: err?.message || "切换账号失败", icon: "none" });
      } finally {
        Taro.hideLoading();
        switchingAccount.value = false;
      }
    }

    useDidShow(() => {
      syncRememberedAccounts();
      void refresh();
    });

    usePullDownRefresh(async () => {
      await refresh();
      Taro.stopPullDownRefresh();
    });

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      computed,
      reactive,
      ref,
      LucideIcon,
      getStoreAccountStats,
      listAllInventories,
      listStoreAccounts,
      listStoreReturns,
      useAuthStore,
      auth,
      today,
      todayAmount,
      totalTurnoverAmount,
      unpaidCount,
      lowStockCount,
      pendingReturnCount,
      accountSheetOpen,
      switchingAccount,
      rememberedAccounts,
      userMenuOpen,
      profileEditorOpen,
      savingProfile,
      profileForm,
      heroStyle,
      notificationStyle,
      userMenuStyle,
      userName,
      initials,
      greeting,
      maskedCurrentPhone,
      rememberedAccountHint,
      hasNotification,
      quickActions,
      businessActions,
      businessPages,
      businessPageIndex,
      businessSwiperStyle,
      todos,
      onBusinessPageChange,
      pad,
      businessDate,
      businessDateStr,
      formatMoney,
      isLowStock,
      countUnpaid,
      refresh,
      go,
      syncRememberedAccounts,
      toggleUserMenu,
      closeUserMenu,
      openNotifications,
      openAccountSheet,
      onAvatarLongPress,
      openProfileEditor,
      closeProfileEditor,
      onProfileInput,
      saveProfile,
      noopTouchMove,
      closeAccountSheet,
      onUseOtherAccount,
      onSelectRememberedAccount,
    };
  },
};

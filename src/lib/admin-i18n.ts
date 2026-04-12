"use client";

import { useEffect, useState, useCallback } from "react";

export type AdminLang = "ko" | "en";

const LS_KEY = "bb_admin_lang";

const TRANSLATIONS = {
  ko: {
    // Layout
    admin_panel: "관리자 패널",
    overview: "개요",
    inbox: "고객 문의",
    users: "사용자",
    revenue: "매출",
    ai_usage: "AI 사용량",
    analytics: "크레딧 분석",
    costs: "비용 분석",
    promotions: "프로모션",
    announcements: "공지사항",
    feedback: "피드백",
    back_to_app: "앱으로 돌아가기",
    log_out: "로그아웃",

    // Stat cards
    revenue_this_month: "이번 달 매출",
    cost_this_month: "이번 달 비용",
    margin: "마진율",
    active_users: "활성 사용자",
    credits_used_today: "오늘 크레딧 사용",
    credits_used_mtd: "이번 달 크레딧 사용",
    estimated_api_cost: "추정 API 비용",
    active_businesses: "활성 사업체",
    vs_last_month: "지난달 대비",
    this_week: "이번 주",
    today: "오늘",
    this_month: "이번 달",
    last_month: "지난달",

    // Charts
    cost_breakdown: "비용 내역",
    revenue_by_plan: "플랜별 매출",
    usage_breakdown: "사용 내역",
    daily_usage_30d: "최근 30일 일별 사용량",
    by_action_type: "작업 타입별",

    // Action types
    light_actions: "경량 작업",
    standard_actions: "표준 작업",
    heavy_actions: "고급 작업",

    // Tables
    top_businesses: "상위 사업체",
    business: "사업체",
    plan: "플랜",
    team_size: "팀원",
    credits_used: "크레딧 사용량",
    storage_used: "스토리지 사용량",
    estimated_cost: "추정 비용",
    user: "사용자",
    usage: "사용량",
    cost: "비용",
    main_action: "주요 작업",
    others: "기타",

    // BYOK
    byok_status: "BYOK 현황",
    byok_businesses: "BYOK 사용 사업체",
    byok_calls_month: "이번 달 BYOK 호출",
    credits_saved: "절약된 BB 크레딧",
    cost_saved: "절약된 BB 비용",

    // Alerts
    abuse_detected: "어뷰징 감지",
    margin_low: "마진 낮음",
    margin_warning: "마진 주의",
    margin_healthy: "마진 양호",
    credit_exhausted: "크레딧 소진 임박",
    credits_remaining: "잔여 크레딧",

    // Business detail
    plan_label: "플랜",
    joined: "가입일",
    members: "팀원",
    monthly_usage: "이번 달 사용량",
    credits: "크레딧",
    storage: "스토리지",
    downloads: "다운로드",
    ai_cost_estimated: "AI 비용 (추정)",
    storage_cost: "스토리지 비용",
    egress_cost: "Egress 비용",
    total_cost: "총 비용",
    revenue_label: "매출",
    margin_label: "마진",
    credit_usage_detail: "크레딧 사용 상세",
    action_type_distribution: "액션 타입별 분포",
    times: "회",

    // States
    loading: "불러오는 중...",
    no_data: "데이터 없음",
    error: "오류",
    refresh: "새로고침",
    purchase_history: "구매 내역",
    no_results: "결과 없음",

    // Misc
    free: "무료",
    starter: "스타터",
    pro: "프로",
    business_plan: "비즈니스",
  },
  en: {
    admin_panel: "Admin Panel",
    overview: "Overview",
    inbox: "Inbox",
    users: "Users",
    revenue: "Revenue",
    ai_usage: "AI Usage",
    analytics: "Analytics",
    costs: "Costs",
    promotions: "Promotions",
    announcements: "Announcements",
    feedback: "Feedback",
    back_to_app: "Back to App",
    log_out: "Log out",

    revenue_this_month: "Revenue This Month",
    cost_this_month: "Cost This Month",
    margin: "Margin",
    active_users: "Active Users",
    credits_used_today: "Credits Used Today",
    credits_used_mtd: "Credits Used MTD",
    estimated_api_cost: "Estimated API Cost",
    active_businesses: "Active Businesses",
    vs_last_month: "vs last month",
    this_week: "this week",
    today: "Today",
    this_month: "This Month",
    last_month: "Last Month",

    cost_breakdown: "Cost Breakdown",
    revenue_by_plan: "Revenue by Plan",
    usage_breakdown: "Usage Breakdown",
    daily_usage_30d: "Daily Usage (Last 30 Days)",
    by_action_type: "By Action Type",

    light_actions: "Light Actions",
    standard_actions: "Standard Actions",
    heavy_actions: "Heavy Actions",

    top_businesses: "Top Businesses",
    business: "Business",
    plan: "Plan",
    team_size: "Team Size",
    credits_used: "Credits Used",
    storage_used: "Storage Used",
    estimated_cost: "Est. Cost",
    user: "User",
    usage: "Usage",
    cost: "Cost",
    main_action: "Main Action",
    others: "Others",

    byok_status: "BYOK Status",
    byok_businesses: "BYOK Businesses",
    byok_calls_month: "BYOK Calls This Month",
    credits_saved: "BB Credits Saved",
    cost_saved: "BB Cost Saved",

    abuse_detected: "Abuse Detected",
    margin_low: "Low Margin",
    margin_warning: "Margin Warning",
    margin_healthy: "Healthy Margin",
    credit_exhausted: "Credits Almost Exhausted",
    credits_remaining: "Credits Remaining",

    plan_label: "Plan",
    joined: "Joined",
    members: "Members",
    monthly_usage: "Monthly Usage",
    credits: "Credits",
    storage: "Storage",
    downloads: "Downloads",
    ai_cost_estimated: "AI Cost (estimated)",
    storage_cost: "Storage Cost",
    egress_cost: "Egress Cost",
    total_cost: "Total Cost",
    revenue_label: "Revenue",
    margin_label: "Margin",
    credit_usage_detail: "Credit Usage Detail",
    action_type_distribution: "Action Type Distribution",
    times: "calls",

    loading: "Loading...",
    no_data: "No data",
    error: "Error",
    refresh: "Refresh",
    purchase_history: "Purchase History",
    no_results: "No results",

    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business_plan: "Business",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.ko;

export function useAdminLang() {
  const [lang, setLangState] = useState<AdminLang>("ko");

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null) as AdminLang | null;
    if (stored === "ko" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key,
    [lang],
  );

  return { lang, setLang, t };
}

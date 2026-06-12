import { useState } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

export function useDashboardFiltersState() {
    const [objectSearchTerm, setObjectSearchTerm] = useState("");
    const [performanceStatusFilter, setPerformanceStatusFilter] = useState<
        "all" | "success" | "error" | "inProgress"
    >("all");
    const [inProgressOnly, setInProgressOnly] = useState(false);
    const [dashboardGroupFilter, setDashboardGroupFilter] = useState<string>("all");
    const [chargePercentOp, setChargePercentOp] = useState<">=" | "<=" | "=" | ">" | "<">(">=");
    const [chargePercentValue, setChargePercentValue] = useState("");

    const [isPerformanceVisible, setIsPerformanceVisible] = useLocalStorageState("dashboard_show_performance", true);
    const [showIndicators, setShowIndicators] = useLocalStorageState("dashboard_show_indicators", true);
    const [isComparisonVisible, setIsComparisonVisible] = useLocalStorageState("dashboard_show_comparison", false);

    return {
        objectSearchTerm, setObjectSearchTerm,
        performanceStatusFilter, setPerformanceStatusFilter,
        inProgressOnly, setInProgressOnly,
        dashboardGroupFilter, setDashboardGroupFilter,
        chargePercentOp, setChargePercentOp,
        chargePercentValue, setChargePercentValue,
        isPerformanceVisible, setIsPerformanceVisible,
        showIndicators, setShowIndicators,
        isComparisonVisible, setIsComparisonVisible
    };
}

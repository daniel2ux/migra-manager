"use client";

import { useState } from "react";

export interface ObjectFormData {
    name: string;
    description: string;
    chargeGroup: string;
    chargeOrder: string;
    parallelOrder: string;
    dependencyIds: string[];
    externalDependencies: string[];
    type: string;
    status: string;
    isParallel: boolean;
    activityGroupIds: string[];
}

const DEFAULT_FORM: ObjectFormData = {
    name: "",
    description: "",
    chargeGroup: "",
    chargeOrder: "",
    parallelOrder: "",
    dependencyIds: [],
    externalDependencies: [],
    type: "SCRIPT",
    status: "ATIVO",
    isParallel: false,
    activityGroupIds: [],
};

export function useObjectForm(initial: Partial<ObjectFormData> = {}) {
    const [formData, setFormData] = useState<ObjectFormData>({
        ...DEFAULT_FORM,
        ...initial,
    });

    const setField = <K extends keyof ObjectFormData>(
        field: K,
        value: ObjectFormData[K]
    ) => setFormData((prev) => ({ ...prev, [field]: value }));

    const reset = (values: Partial<ObjectFormData> = {}) =>
        setFormData({ ...DEFAULT_FORM, ...values });

    return { formData, setFormData, setField, reset };
}

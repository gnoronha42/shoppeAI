"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AnalysisType } from "@/types";

interface AnalysisTypeSelectorProps {
  value: AnalysisType;
  onChange: (value: AnalysisType) => void;
}

export function AnalysisTypeSelector({ value, onChange }: AnalysisTypeSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(value) => onChange(value as AnalysisType)}
      className="flex space-x-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="account" id="account" />
        <Label htmlFor="account" className="cursor-pointer">Análise de Conta</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="ads" id="ads" />
        <Label htmlFor="ads" className="cursor-pointer">Análise de Ads</Label>
      </div>
    </RadioGroup>
  );
}
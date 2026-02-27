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
      className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="account" id="account" />
        <Label htmlFor="account" className="cursor-pointer">Análise de Conta</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="ads" id="ads" />
        <Label htmlFor="ads" className="cursor-pointer">Análise de Ads</Label>
      </div>
      {/* <div className="flex items-center space-x-2">
        <RadioGroupItem value="express" id="express" />
        <Label htmlFor="express" className="cursor-pointer">Análise Semanal</Label>
      </div> */}
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="whatsapp-consultivo" id="whatsapp-consultivo" />
        <Label htmlFor="whatsapp-consultivo" className="cursor-pointer">Análise  Consultiva</Label>
      </div>
    </RadioGroup>
  );
}
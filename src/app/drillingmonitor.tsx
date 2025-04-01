"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  Drill,
  Activity,
  Package,
  Gauge,
  Anchor,
} from "lucide-react";
import { useSocket } from "../socket"; // Importa el hook

function DrillingMonitor() {
  // Estados para las métricas de perforación
  const [metrics, setMetrics] = useState({
    totalDepth: 0,
    bitDepth: 0,
    rateOfPenetration: 0,
    weightOnBit: 0,
    pumpPressure: 0,
    hookLoad: 0,
    // Nuevas métricas
    slips: "",
    onBottom: "",
    strokesPerMinute1: 0,
    strokesPerMinute2: 0,
    torque: 0,
    wellVolume: 0,
  });

  // Actualiza las métricas en tiempo real cuando se reciben datos desde el servidor
  useSocket("sensorData", (data) => {
    const dataGroup = data.dataGroup[0]; // Asumimos que hay un solo objeto en dataGroup
    setMetrics({
      totalDepth: parseFloat(dataGroup.HOLE_DEPTH) || metrics.totalDepth,
      bitDepth: parseFloat(dataGroup.DEPTH) || metrics.bitDepth,
      rateOfPenetration: parseFloat(dataGroup.ROP) || metrics.rateOfPenetration,
      weightOnBit: parseFloat(dataGroup.WOB) || metrics.weightOnBit,
      pumpPressure: parseFloat(dataGroup.SPP) || metrics.pumpPressure,
      hookLoad: parseFloat(dataGroup.HOOKLOAD) || metrics.hookLoad,
      slips: dataGroup.SLIPS || metrics.slips,
      onBottom: dataGroup.ON_BOTTOM || metrics.onBottom,
      strokesPerMinute1:
        parseFloat(dataGroup.SPM1) || metrics.strokesPerMinute1,
      strokesPerMinute2:
        parseFloat(dataGroup.SPM2) || metrics.strokesPerMinute2,
      torque: parseFloat(dataGroup.TORQ) || metrics.torque,
      wellVolume: parseFloat(dataGroup.FLOW) || metrics.wellVolume,
    });
  });

  return (
    <div className="max-h-screen bg-background text-foreground">
      <Card className="w-full max-w-full mx-auto bg-background border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">
                Drilling Data Monitor
              </CardTitle>
              <CardDescription className="text-sm">
                Real-time Data
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="bg-secondary text-secondary-foreground"
            >
              In Operation
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <MetricCard
              title="Total Depth"
              value={metrics.totalDepth}
              unit="m"
              icon={<ArrowDownCircle className="h-4 w-4" />}
            />
            <MetricCard
              title="Bit Depth"
              value={metrics.bitDepth}
              unit="m"
              icon={<Drill className="h-4 w-4" />}
            />
            <MetricCard
              title="Rate of Penetration"
              value={metrics.rateOfPenetration}
              unit="m/hr"
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              title="Weight On Bit"
              value={metrics.weightOnBit}
              unit="klb"
              icon={<Package className="h-4 w-4" />}
            />
            <MetricCard
              title="Pump Pressure"
              value={metrics.pumpPressure}
              unit="psi"
              icon={<Gauge className="h-4 w-4" />}
            />
            <MetricCard
              title="Hook Load"
              value={metrics.hookLoad}
              unit="klb"
              icon={<Anchor className="h-4 w-4" />}
            />
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatusCard title="SPM" value="0" unit="Stk/Min" />
            <StatusCard
              title="Strokes Per Minute 1"
              value={metrics.strokesPerMinute1}
              unit="Stk/Min"
            />
            <StatusCard
              title="Strokes Per Minute 2"
              value={metrics.strokesPerMinute2}
              unit="Stk/Min"
            />
            <StatusCard title="Slips" value={metrics.slips} unit="" />
            <StatusCard title="On Bottom" value={metrics.onBottom} unit="" />
            {/* <StatusCard title="Strokes (Total)" value="891" unit="stks" /> */}
            <StatusCard
              title="Strokes 1"
              value={metrics.strokesPerMinute1}
              unit="stks"
            />
            <StatusCard
              title="Strokes 2"
              value={metrics.strokesPerMinute1}
              unit="stks"
            />
            <StatusCard
              title="Well Volume"
              value={metrics.wellVolume}
              unit="m³"
            />
            {/* <StatusCard title="Volumen del Pozo" value="500" unit="m³" />
            <StatusCard title="Volumen del Pozo" value="500" unit="m³" /> */}
            {/* <StatusCard title="Torque" value="0" unit="ft-lbs" />
            <StatusCard title="Volumen del Pozo" value="500" unit="m³" />
            <StatusCard title="Volumen del Pozo" value="500" unit="m³" /> */}
            <StatusCard title="Torque" value={metrics.torque} unit="ft-lbs" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  unit,
  icon,
}: {
  title: string;
  value: number;
  unit: string;
  icon: JSX.Element;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {icon}
        </div>
        <div className="text-2xl font-bold">
          {value}
          <span className="text-sm ml-1 text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({
  title,
  value,
  unit,
}: {
  title: string;
  value: string | number; // value puede ser un string o número
  unit: string;
}) {
  return (
    <Card className="bg-muted border-border">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </h3>
        <div className="text-xl font-bold">
          {value}
          <span className="text-sm ml-1 text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default DrillingMonitor;

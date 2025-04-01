"use client";

import { useState, useEffect } from "react";
import Speedometer, {
  Background,
  Arc,
  Needle,
  Progress,
  Marks,
  Indicator,
} from "react-speedometer";
import { useSocket } from "@/socket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, Thermometer } from "lucide-react";

interface DataPoint {
  time: string;
  totalDepth: number;
  bitDepth: number;
  rateOfPenetration: number;
  weightOnBit: number;
  pumpPressure: number;
  hookLoad: number;
  slips: string;
  onBottom: string;
  strokesPerMinute1: number;
  strokesPerMinute2: number;
  torque: number;
  wellVolume: number;
  [key: string]: number | string;
}

interface MetricConfig {
  label: string;
  color: string;
  icon: JSX.Element;
  unit: string;
  maxValue: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("totalDepth");
  const [isConnected, setIsConnected] = useState(false);

  useSocket("sensorData", (data) => {
    setIsConnected(true);
    const dataGroup = data.dataGroup[0];
    const newDataPoint: DataPoint = {
      time: new Date().toLocaleTimeString(),
      totalDepth: parseFloat(dataGroup.HOLE_DEPTH) || 0,
      bitDepth: parseFloat(dataGroup.DEPTH) || 0,
      rateOfPenetration: parseFloat(dataGroup.ROP) || 0,
      weightOnBit: parseFloat(dataGroup.WOB) || 0,
      pumpPressure: parseFloat(dataGroup.SPP) || 0,
      hookLoad: parseFloat(dataGroup.HOOKLOAD) || 0,
      slips: dataGroup.SLIPS || "N/A",
      onBottom: dataGroup.ON_BOTTOM || "N/A",
      strokesPerMinute1: parseFloat(dataGroup.SPM1) || 0,
      strokesPerMinute2: parseFloat(dataGroup.SPM2) || 0,
      torque: parseFloat(dataGroup.TORQ) || 0,
      wellVolume: parseFloat(dataGroup.FLOW) || 0,
    };

    setData((currentData) => {
      const newData = [...currentData, newDataPoint];
      if (newData.length > 20) newData.shift();
      return newData;
    });
  });

  useEffect(() => {
    const handleDisconnect = () => setIsConnected(false);
    window.addEventListener("beforeunload", handleDisconnect);
    return () => window.removeEventListener("beforeunload", handleDisconnect);
  }, []);

  const metricConfig: Record<string, MetricConfig> = {
    totalDepth: {
      label: "Total Depth",
      color: "hsl(152, 100%, 50%)",
      icon: <Cpu className="h-4 w-4" />,
      unit: "m",
      maxValue: 10000,
    },
    bitDepth: {
      label: "Bit Depth",
      color: "hsl(206, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "m",
      maxValue: 10000,
    },
    rateOfPenetration: {
      label: "Rate of Penetration",
      color: "hsl(0, 100%, 50%)",
      icon: <Thermometer className="h-4 w-4" />,
      unit: "m/h",
      maxValue: 100,
    },
    weightOnBit: {
      label: "Weight on Bit",
      color: "hsl(45, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "kg",
      maxValue: 50000,
    },
    pumpPressure: {
      label: "Pump Pressure",
      color: "hsl(90, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "Pa",
      maxValue: 5000,
    },
    hookLoad: {
      label: "Hook Load",
      color: "hsl(180, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "kg",
      maxValue: 50000,
    },
    strokesPerMinute1: {
      label: "Strokes Per Minute 1",
      color: "hsl(270, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "SPM",
      maxValue: 200,
    },
    strokesPerMinute2: {
      label: "Strokes Per Minute 2",
      color: "hsl(360, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "SPM",
      maxValue: 200,
    },
    torque: {
      label: "Torque",
      color: "hsl(120, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "Nm",
      maxValue: 50000,
    },
    wellVolume: {
      label: "Well Volume",
      color: "hsl(240, 100%, 50%)",
      icon: <Activity className="h-4 w-4" />,
      unit: "L",
      maxValue: 10000,
    },
  };

  return (
    <div className="max-h-screen bg-background p-4">
      <Card className="w-full max-w-full mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">
                Medidores en Tiempo Real
              </CardTitle>
              <CardDescription className="text-sm">
                Datos en vivo
              </CardDescription>
            </div>
            <Badge variant="default" className="self-start sm:self-auto">
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Seleccionar métrica" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(metricConfig).map((key) => (
                  <SelectItem key={key} value={key}>
                    {metricConfig[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(metricConfig).map(
              ([key, { label, color, icon, unit, maxValue }]) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-2 bg-muted p-4 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <Speedometer
                    value={
                      data.length > 0
                        ? (data[data.length - 1][
                            key as keyof DataPoint
                          ] as number)
                        : 0
                    }
                    width={250}
                    height={250}
                    fontFamily="arial"
                    max={120}
                  >
                    <Background />
                    <Arc />
                    <Needle />
                    <Progress color={color} />
                    <Marks fontSize={15} />
                    <Indicator fontSize={30} />
                  </Speedometer>
                  <span className="text-sm">
                    {data.length > 0
                      ? `${(data[data.length - 1] as any)[
                          key as keyof DataPoint
                        ].toFixed(2)} ${unit}`
                      : "N/A"}
                  </span>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

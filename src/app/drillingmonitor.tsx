"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Anchor,
  Drill,
  Gauge,
  Package,
  Waves,
  Ruler,
  Droplets,
  Flame,
  Clock,
  AlertTriangle,
  Layers,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useSocket } from "../socket";

interface Indicator {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  thresholds?: { low: number; high: number };
}

interface IndicatorGroup {
  id: string;
  name: string;
  icon: JSX.Element;
  indicators: Indicator[];
}

function DrillingMonitor() {
  const [indicators, setIndicators] = useState<Record<string, number | string>>(
    {}
  );
  const [criticalCount, setCriticalCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Umbrales para determinar valores críticos
  const thresholdsConfig = {
    // Datos operacionales
    ROP: { low: 5, high: 20 },
    WOB: { low: 10, high: 30 },
    PUMP_PRESSURE: { low: 1500, high: 3000 },
    PUMP_STROKE_RATE_1: { low: 40, high: 120 },
    PUMP_STROKE_RATE_2: { low: 40, high: 120 },
    PUMP_STROKE_RATE_3: { low: 40, high: 120 },
    HOOKLOAD: { low: 100, high: 300 },
    RPM: { low: 40, high: 120 },
    ROTARY_TORQUE_AMPS: { low: 50, high: 200 },
    RPM_DEL_MOTOR: { low: 40, high: 120 },
    BIT_MEAS_DEPTH: { low: 0, high: 100000 },
    TOTAL_MEAS_DEPTH: { low: 0, high: 100000 },
    BLOCK_POSITION: { low: 10, high: 90 },
    MUD_FLOW_IN: { low: 300, high: 1200 },
    MUD_FLOW_OUT_PERCENTAGE: { low: 80, high: 120 },

    // Volúmenes
    VOLUMEN_TANK_INTERMEDIO: { low: 50, high: 200 },
    VOLUMEN_TANK_SUCCION: { low: 100, high: 300 },
    VOLUMEN_TANK_RETORNO: { low: 100, high: 300 },
    VOLUMEN_TANK_RESERVA: { low: 50, high: 200 },
    VOLUMEN_TOTAL_ACTIVO: { low: 300, high: 800 },
    VOLUMEN_TOTAL_DE_LODO_BOMBEADO: { low: 0, high: 10000 },
    TOTAL_PUMPED_VOLUME: { low: 0, high: 10000 },
    GAIN_LOSS: { low: -5, high: 5 },

    // Gases
    TOTAL_GAS: { low: 20, high: 80 },
    METHANE_C1: { low: 10, high: 40 },
    ETHANE_C2: { low: 5, high: 15 },
    PROPANE_C3: { low: 2, high: 8 },
    ISOBUTANE_C4I: { low: 1, high: 4 },
    NOR_BUTANE_C4N: { low: 1, high: 4 },
    NOR_PENTANE: { low: 0.5, high: 2.5 },
    ISO_PENTANE_C5I: { low: 0.5, high: 2.5 },
    H2S: { low: 2, high: 5 },
    CARBON_DIOXIDE: { low: 1, high: 3 },

    // Tiempos
    BIT_DRILL_TIME: { low: 0, high: 500 },
    LAG_TIME: { low: 5, high: 30 },
    LAG_DEPTH: { low: 0, high: 1000 },
    LAG_STROKES: { low: 0, high: 10000 },
    TOTAL_STROKES: { low: 0, high: 1000000 },
    PUMP_STROKE_COUNT_BOMBA_1: { low: 0, high: 100000 },
    PUMP_STROKE_COUNT_BOMBA_2: { low: 0, high: 100000 },
    PUMP_STROKE_COUNT_BOMBA_3: { low: 0, high: 100000 },
  };

  // Mapeo de unidades basado en el codeMap
  const unitsMap: Record<string, string> = {
    // Datos operacionales
    ROP: "m/h",
    WOB: "klb",
    PUMP_PRESSURE: "psi",
    PUMP_STROKE_RATE_1: "spm",
    PUMP_STROKE_RATE_2: "spm",
    PUMP_STROKE_RATE_3: "spm",
    HOOKLOAD: "klb",
    RPM: "rpm",
    ROTARY_TORQUE_AMPS: "A",
    RPM_DEL_MOTOR: "rpm",
    BIT_MEAS_DEPTH: "m",
    TOTAL_MEAS_DEPTH: "m",
    BLOCK_POSITION: "m",
    MUD_FLOW_IN: "lpm",
    MUD_FLOW_OUT_PERCENTAGE: "%",
    MUD_DENSITY_OUT: "kg/m³",
    MUD_TEMP_OUT: "°C",
    BIT_DRILL_TIME: "hours",

    // Volúmenes
    VOLUMEN_TANK_INTERMEDIO: "m³",
    VOLUMEN_TANK_SUCCION: "m³",
    VOLUMEN_TANK_RETORNO: "m³",
    VOLUMEN_TANK_RESERVA: "m³",
    VOLUMEN_TOTAL_ACTIVO: "m³",
    VOLUMEN_TOTAL_DE_LODO_BOMBEADO: "m³",
    TOTAL_PUMPED_VOLUME: "m³",
    GAIN_LOSS: "m³",

    // Gases
    TOTAL_GAS: "ppm",
    METHANE_C1: "ppm",
    ETHANE_C2: "ppm",
    PROPANE_C3: "ppm",
    ISOBUTANE_C4I: "ppm",
    NOR_BUTANE_C4N: "ppm",
    NOR_PENTANE: "ppm",
    ISO_PENTANE_C5I: "ppm",
    H2S: "ppm",
    CARBON_DIOXIDE: "ppm",

    // Tiempos y conteos
    LAG_TIME: "min",
    LAG_DEPTH: "m",
    LAG_STROKES: "strokes",
    TOTAL_STROKES: "strokes",
    PUMP_STROKE_COUNT_BOMBA_1: "strokes",
    PUMP_STROKE_COUNT_BOMBA_2: "strokes",
    PUMP_STROKE_COUNT_BOMBA_3: "strokes",

    // Desconocidos
    UNKNOWN_1: "m",
    UNKNOWN_2: "m",
    UNKNOWN_3: "m",
  };

  // Actualizar indicadores desde el socket
  useSocket("sensorData", (data) => {
    setIsConnected(true);
    setLastUpdate(new Date().toLocaleTimeString());

    if (data.dataGroup && data.dataGroup.length > 0) {
      const newIndicators: Record<string, number | string> = {};
      const sensorData = data.dataGroup[0];

      Object.keys(sensorData).forEach((key) => {
        if (key !== "data" && key !== "time") {
          const value = sensorData[key];
          newIndicators[key] = isNaN(Number(value)) ? value : Number(value);
        }
      });

      setIndicators(newIndicators);
    }
  });

  // Efecto para detectar desconexión
  useEffect(() => {
    const connectionCheckInterval = setInterval(() => {
      if (
        lastUpdate &&
        new Date().getTime() - new Date(lastUpdate).getTime() > 10000
      ) {
        setIsConnected(false);
      }
    }, 5000);

    return () => clearInterval(connectionCheckInterval);
  }, [lastUpdate]);

  // Calcular indicadores críticos
  useEffect(() => {
    let count = 0;
    Object.keys(indicators).forEach((key) => {
      const threshold = thresholdsConfig[key as keyof typeof thresholdsConfig];
      const value = indicators[key];

      if (threshold && typeof value === "number") {
        if (value < threshold.low || value > threshold.high) {
          count++;
        }
      }
    });
    setCriticalCount(count);
  }, [indicators]);

  // Función para determinar el color del indicador
  const getStatusColor = (value: number | string, key: string) => {
    if (typeof value !== "number") return "text-[#D8D8D8]";

    const threshold = thresholdsConfig[key as keyof typeof thresholdsConfig];
    if (!threshold) return "text-[#D8D8D8]";

    // if (value < threshold.low) return "text-[#00CED1]";
    // if (value > threshold.high) return "text-[#FF5555]";
    return "text-[#D8D8D8]";
  };

  // Función para obtener el nombre legible del indicador
  const getDisplayName = (key: string): string => {
    const nameMap: Record<string, string> = {
      // Datos operacionales
      ROP: "ROP",
      WOB: "WOB",
      PUMP_PRESSURE: "PUMP PRESSURE",
      PUMP_STROKE_RATE_1: "PUMP STROKE RATE 1",
      PUMP_STROKE_RATE_2: "PUMP STROKE RATE 2",
      PUMP_STROKE_RATE_3: "PUMP STROKE RATE 3",
      HOOKLOAD: "HOOKLOAD",
      RPM: "RPM",
      ROTARY_TORQUE_AMPS: "ROTARY TORQUE",
      RPM_DEL_MOTOR: "MOTOR RPM",
      BIT_MEAS_DEPTH: "BIT DEPTH",
      TOTAL_MEAS_DEPTH: "TOTAL DEPTH",
      BLOCK_POSITION: "BLOCK POSITION",
      MUD_FLOW_IN: "MUD FLOW IN",
      MUD_FLOW_OUT_PERCENTAGE: "MUD FLOW OUT %",
      MUD_DENSITY_OUT: "MUD DENSITY OUT",
      MUD_TEMP_OUT: "MUD TEMP OUT",
      BIT_DRILL_TIME: "BIT DRILL TIME",

      // Volúmenes
      VOLUMEN_TANK_INTERMEDIO: "TANK INTERMEDIO",
      VOLUMEN_TANK_SUCCION: "TANK SUCCION",
      VOLUMEN_TANK_RETORNO: "TANK RETORNO",
      VOLUMEN_TANK_RESERVA: "TANK RESERVA",
      VOLUMEN_TOTAL_ACTIVO: "TOTAL VOL ACT",
      VOLUMEN_TOTAL_DE_LODO_BOMBEADO: "TOTAL LODO BOMB",
      TOTAL_PUMPED_VOLUME: "TOTAL PUMPED VOL",
      GAIN_LOSS: "GAIN/LOSS",

      // Gases
      TOTAL_GAS: "TOTAL GAS",
      METHANE_C1: "METHANE C1",
      ETHANE_C2: "ETHANE C2",
      PROPANE_C3: "PROPANE C3",
      ISOBUTANE_C4I: "ISOBUTANE C4I",
      NOR_BUTANE_C4N: "NOR BUTANE C4N",
      NOR_PENTANE: "NOR PENTANE",
      ISO_PENTANE_C5I: "ISO PENTANE C5I",
      H2S: "H2S",
      CARBON_DIOXIDE: "CO2",

      // Tiempos y conteos
      LAG_TIME: "LAG TIME",
      LAG_DEPTH: "LAG DEPTH",
      LAG_STROKES: "LAG STROKES",
      TOTAL_STROKES: "TOTAL STROKES",
      PUMP_STROKE_COUNT_BOMBA_1: "STROKES BOMBA 1",
      PUMP_STROKE_COUNT_BOMBA_2: "STROKES BOMBA 2",
      PUMP_STROKE_COUNT_BOMBA_3: "STROKES BOMBA 3",

      // Desconocidos
      UNKNOWN_1: "UNKNOWN 1",
      UNKNOWN_2: "UNKNOWN 2",
      UNKNOWN_3: "UNKNOWN 3",
    };

    return nameMap[key] || key;
  };

  // Grupos de indicadores
  const indicatorGroups: IndicatorGroup[] = [
    {
      id: "drilling",
      name: "Drilling Parameters",
      icon: <Drill className="h-4 w-4" />,
      indicators: [
        {
          id: "ROP",
          name: getDisplayName("ROP"),
          value: indicators.ROP || 0,
          unit: unitsMap.ROP || "",
        },
        {
          id: "WOB",
          name: getDisplayName("WOB"),
          value: indicators.WOB || 0,
          unit: unitsMap.WOB || "",
        },
        {
          id: "HOOKLOAD",
          name: getDisplayName("HOOKLOAD"),
          value: indicators.HOOKLOAD || 0,
          unit: unitsMap.HOOKLOAD || "",
        },
        {
          id: "RPM",
          name: getDisplayName("RPM"),
          value: indicators.RPM || 0,
          unit: unitsMap.RPM || "",
        },
        {
          id: "ROTARY_TORQUE_AMPS",
          name: getDisplayName("ROTARY_TORQUE_AMPS"),
          value: indicators.ROTARY_TORQUE_AMPS || 0,
          unit: unitsMap.ROTARY_TORQUE_AMPS || "",
        },
        {
          id: "RPM_DEL_MOTOR",
          name: getDisplayName("RPM_DEL_MOTOR"),
          value: indicators.RPM_DEL_MOTOR || 0,
          unit: unitsMap.RPM_DEL_MOTOR || "",
        },
        {
          id: "BIT_MEAS_DEPTH",
          name: getDisplayName("BIT_MEAS_DEPTH"),
          value: indicators.BIT_MEAS_DEPTH || 0,
          unit: unitsMap.BIT_MEAS_DEPTH || "",
        },
        {
          id: "TOTAL_MEAS_DEPTH",
          name: getDisplayName("TOTAL_MEAS_DEPTH"),
          value: indicators.TOTAL_MEAS_DEPTH || 0,
          unit: unitsMap.TOTAL_MEAS_DEPTH || "",
        },
        {
          id: "BLOCK_POSITION",
          name: getDisplayName("BLOCK_POSITION"),
          value: indicators.BLOCK_POSITION || 0,
          unit: unitsMap.BLOCK_POSITION || "",
        },
        {
          id: "BIT_DRILL_TIME",
          name: getDisplayName("BIT_DRILL_TIME"),
          value: indicators.BIT_DRILL_TIME || 0,
          unit: unitsMap.BIT_DRILL_TIME || "",
        },
      ],
    },
    {
      id: "pumps",
      name: "Pump System",
      icon: <Waves className="h-4 w-4" />,
      indicators: [
        {
          id: "PUMP_PRESSURE",
          name: getDisplayName("PUMP_PRESSURE"),
          value: indicators.PUMP_PRESSURE || 0,
          unit: unitsMap.PUMP_PRESSURE || "",
        },
        {
          id: "PUMP_STROKE_RATE_1",
          name: getDisplayName("PUMP_STROKE_RATE_1"),
          value: indicators.PUMP_STROKE_RATE_1 || 0,
          unit: unitsMap.PUMP_STROKE_RATE_1 || "",
        },
        {
          id: "PUMP_STROKE_RATE_2",
          name: getDisplayName("PUMP_STROKE_RATE_2"),
          value: indicators.PUMP_STROKE_RATE_2 || 0,
          unit: unitsMap.PUMP_STROKE_RATE_2 || "",
        },
        {
          id: "PUMP_STROKE_RATE_3",
          name: getDisplayName("PUMP_STROKE_RATE_3"),
          value: indicators.PUMP_STROKE_RATE_3 || 0,
          unit: unitsMap.PUMP_STROKE_RATE_3 || "",
        },
        {
          id: "MUD_FLOW_IN",
          name: getDisplayName("MUD_FLOW_IN"),
          value: indicators.MUD_FLOW_IN || 0,
          unit: unitsMap.MUD_FLOW_IN || "",
        },
        {
          id: "MUD_FLOW_OUT_PERCENTAGE",
          name: getDisplayName("MUD_FLOW_OUT_PERCENTAGE"),
          value: indicators.MUD_FLOW_OUT_PERCENTAGE || 0,
          unit: unitsMap.MUD_FLOW_OUT_PERCENTAGE || "",
        },
        {
          id: "MUD_DENSITY_OUT",
          name: getDisplayName("MUD_DENSITY_OUT"),
          value: indicators.MUD_DENSITY_OUT || 0,
          unit: unitsMap.MUD_DENSITY_OUT || "",
        },
        {
          id: "MUD_TEMP_OUT",
          name: getDisplayName("MUD_TEMP_OUT"),
          value: indicators.MUD_TEMP_OUT || 0,
          unit: unitsMap.MUD_TEMP_OUT || "",
        },
      ],
    },
    {
      id: "volumes",
      name: "Mud Volumes",
      icon: <Droplets className="h-4 w-4" />,
      indicators: [
        {
          id: "VOLUMEN_TANK_INTERMEDIO",
          name: getDisplayName("VOLUMEN_TANK_INTERMEDIO"),
          value: indicators.VOLUMEN_TANK_INTERMEDIO || 0,
          unit: unitsMap.VOLUMEN_TANK_INTERMEDIO || "",
        },
        {
          id: "VOLUMEN_TANK_SUCCION",
          name: getDisplayName("VOLUMEN_TANK_SUCCION"),
          value: indicators.VOLUMEN_TANK_SUCCION || 0,
          unit: unitsMap.VOLUMEN_TANK_SUCCION || "",
        },
        {
          id: "VOLUMEN_TANK_RETORNO",
          name: getDisplayName("VOLUMEN_TANK_RETORNO"),
          value: indicators.VOLUMEN_TANK_RETORNO || 0,
          unit: unitsMap.VOLUMEN_TANK_RETORNO || "",
        },
        {
          id: "VOLUMEN_TANK_RESERVA",
          name: getDisplayName("VOLUMEN_TANK_RESERVA"),
          value: indicators.VOLUMEN_TANK_RESERVA || 0,
          unit: unitsMap.VOLUMEN_TANK_RESERVA || "",
        },
        {
          id: "VOLUMEN_TOTAL_ACTIVO",
          name: getDisplayName("VOLUMEN_TOTAL_ACTIVO"),
          value: indicators.VOLUMEN_TOTAL_ACTIVO || 0,
          unit: unitsMap.VOLUMEN_TOTAL_ACTIVO || "",
        },
        {
          id: "VOLUMEN_TOTAL_DE_LODO_BOMBEADO",
          name: getDisplayName("VOLUMEN_TOTAL_DE_LODO_BOMBEADO"),
          value: indicators.VOLUMEN_TOTAL_DE_LODO_BOMBEADO || 0,
          unit: unitsMap.VOLUMEN_TOTAL_DE_LODO_BOMBEADO || "",
        },
        {
          id: "TOTAL_PUMPED_VOLUME",
          name: getDisplayName("TOTAL_PUMPED_VOLUME"),
          value: indicators.TOTAL_PUMPED_VOLUME || 0,
          unit: unitsMap.TOTAL_PUMPED_VOLUME || "",
        },
        {
          id: "GAIN_LOSS",
          name: getDisplayName("GAIN_LOSS"),
          value: indicators.GAIN_LOSS || 0,
          unit: unitsMap.GAIN_LOSS || "",
        },
      ],
    },
    {
      id: "gas",
      name: "Gas Data",
      icon: <Flame className="h-4 w-4" />,
      indicators: [
        {
          id: "TOTAL_GAS",
          name: getDisplayName("TOTAL_GAS"),
          value: indicators.TOTAL_GAS || 0,
          unit: unitsMap.TOTAL_GAS || "",
        },
        {
          id: "METHANE_C1",
          name: getDisplayName("METHANE_C1"),
          value: indicators.METHANE_C1 || 0,
          unit: unitsMap.METHANE_C1 || "",
        },
        {
          id: "ETHANE_C2",
          name: getDisplayName("ETHANE_C2"),
          value: indicators.ETHANE_C2 || 0,
          unit: unitsMap.ETHANE_C2 || "",
        },
        {
          id: "PROPANE_C3",
          name: getDisplayName("PROPANE_C3"),
          value: indicators.PROPANE_C3 || 0,
          unit: unitsMap.PROPANE_C3 || "",
        },
        {
          id: "ISOBUTANE_C4I",
          name: getDisplayName("ISOBUTANE_C4I"),
          value: indicators.ISOBUTANE_C4I || 0,
          unit: unitsMap.ISOBUTANE_C4I || "",
        },
        {
          id: "NOR_BUTANE_C4N",
          name: getDisplayName("NOR_BUTANE_C4N"),
          value: indicators.NOR_BUTANE_C4N || 0,
          unit: unitsMap.NOR_BUTANE_C4N || "",
        },
        {
          id: "NOR_PENTANE",
          name: getDisplayName("NOR_PENTANE"),
          value: indicators.NOR_PENTANE || 0,
          unit: unitsMap.NOR_PENTANE || "",
        },
        {
          id: "ISO_PENTANE_C5I",
          name: getDisplayName("ISO_PENTANE_C5I"),
          value: indicators.ISO_PENTANE_C5I || 0,
          unit: unitsMap.ISO_PENTANE_C5I || "",
        },
        {
          id: "H2S",
          name: getDisplayName("H2S"),
          value: indicators.H2S || 0,
          unit: unitsMap.H2S || "",
        },
        {
          id: "CARBON_DIOXIDE",
          name: getDisplayName("CARBON_DIOXIDE"),
          value: indicators.CARBON_DIOXIDE || 0,
          unit: unitsMap.CARBON_DIOXIDE || "",
        },
      ],
    },
    {
      id: "counts",
      name: "Counts & Times",
      icon: <Clock className="h-4 w-4" />,
      indicators: [
        {
          id: "TOTAL_STROKES",
          name: getDisplayName("TOTAL_STROKES"),
          value: indicators.TOTAL_STROKES || 0,
          unit: unitsMap.TOTAL_STROKES || "",
        },
        {
          id: "PUMP_STROKE_COUNT_BOMBA_1",
          name: getDisplayName("PUMP_STROKE_COUNT_BOMBA_1"),
          value: indicators.PUMP_STROKE_COUNT_BOMBA_1 || 0,
          unit: unitsMap.PUMP_STROKE_COUNT_BOMBA_1 || "",
        },
        {
          id: "PUMP_STROKE_COUNT_BOMBA_2",
          name: getDisplayName("PUMP_STROKE_COUNT_BOMBA_2"),
          value: indicators.PUMP_STROKE_COUNT_BOMBA_2 || 0,
          unit: unitsMap.PUMP_STROKE_COUNT_BOMBA_2 || "",
        },
        {
          id: "PUMP_STROKE_COUNT_BOMBA_3",
          name: getDisplayName("PUMP_STROKE_COUNT_BOMBA_3"),
          value: indicators.PUMP_STROKE_COUNT_BOMBA_3 || 0,
          unit: unitsMap.PUMP_STROKE_COUNT_BOMBA_3 || "",
        },
        {
          id: "LAG_TIME",
          name: getDisplayName("LAG_TIME"),
          value: indicators.LAG_TIME || 0,
          unit: unitsMap.LAG_TIME || "",
        },
        {
          id: "LAG_DEPTH",
          name: getDisplayName("LAG_DEPTH"),
          value: indicators.LAG_DEPTH || 0,
          unit: unitsMap.LAG_DEPTH || "",
        },
        {
          id: "LAG_STROKES",
          name: getDisplayName("LAG_STROKES"),
          value: indicators.LAG_STROKES || 0,
          unit: unitsMap.LAG_STROKES || "",
        },
      ],
    },
    {
      id: "unknown",
      name: "Other Data",
      icon: <Activity className="h-4 w-4" />,
      indicators: [
        {
          id: "UNKNOWN_1",
          name: getDisplayName("UNKNOWN_1"),
          value: indicators.UNKNOWN_1 || 0,
          unit: unitsMap.UNKNOWN_1 || "",
        },
        {
          id: "UNKNOWN_2",
          name: getDisplayName("UNKNOWN_2"),
          value: indicators.UNKNOWN_2 || 0,
          unit: unitsMap.UNKNOWN_2 || "",
        },
        {
          id: "UNKNOWN_3",
          name: getDisplayName("UNKNOWN_3"),
          value: indicators.UNKNOWN_3 || 0,
          unit: unitsMap.UNKNOWN_3 || "",
        },
      ],
    },
  ];

  return (
    <Card className="w-full h-full bg-[#0A0A0A] border-[#2D2D2D] overflow-auto font-mono">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#D8D8D8] text-2xl tracking-tighter">
            DRILLING MONITOR
          </CardTitle>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={`bg-[#1E1E1E] border-[#2D2D2D] font-mono text-md ${
                isConnected ? "text-[#00FF00]" : "text-[#FF5555]"
              }`}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </Badge>

            {/* {criticalCount > 0 && (
              <Badge
                variant="outline"
                className="bg-[#1E1E1E] text-[#FF5555] border-[#2D2D2D] font-mono text-md"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalCount} ALERTS
              </Badge>
            )} */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-6">
          {indicatorGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2">
                {group.icon}
                <h3 className="text-sm font-medium text-[#D8D8D8] tracking-wider">
                  {group.name}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {group.indicators.map((indicator) => (
                  <IndicatorBox
                    key={indicator.id}
                    name={indicator.name}
                    value={indicator.value}
                    unit={indicator.unit}
                    color={getStatusColor(indicator.value, indicator.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para indicadores
const IndicatorBox = ({
  name,
  value,
  unit,
  color = "text-[#D8D8D8]",
}: {
  name: string;
  value: number | string;
  unit: string;
  color?: string;
}) => {
  return (
    <div className="border border-[#2D2D2D] bg-[#0A0A0A] rounded-md flex flex-col items-center justify-between h-full">
      <div className="text-xl text-[#00CED1] font-medium w-full text-center py-1 border-b border-[#2D2D2D] tracking-wider">
        {name}
      </div>
      <div
        className={`text-xl md:text-3xl font-bold py-2 ${color} tracking-tighter`}
      >
        {typeof value === "number" ? value.toLocaleString() : value || "N/A"}
      </div>
      <div className="text-md text-[#8A8A8A] w-full text-center py-1 border-t border-[#2D2D2D] tracking-wider">
        {unit}
      </div>
    </div>
  );
};

export default DrillingMonitor;

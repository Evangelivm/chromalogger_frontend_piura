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
    PUMP_STK_R_1: { low: 40, high: 120 },
    PUMP_STK_R_2: { low: 40, high: 120 },
    PUMP_STK_R_3: { low: 40, high: 120 },
    HOOKLOAD: { low: 100, high: 300 },
    RPM: { low: 40, high: 120 },
    ROT_TORQ_AMP: { low: 50, high: 200 },
    RPM_MOTOR: { low: 40, high: 120 },
    BIT_M_DEPTH: { low: 0, high: 100000 },
    TOT_M_DEPTH: { low: 0, high: 100000 },
    BLOCK_POSITION: { low: 10, high: 90 },
    MUD_FLOW_IN: { low: 300, high: 1200 },
    MUD_FLOW_OUT_PER: { low: 80, high: 120 },

    // Volúmenes
    VOL_TANK_INT: { low: 50, high: 200 },
    VOL_TANK_SUCCION: { low: 100, high: 300 },
    VOL_TANK_RET: { low: 100, high: 300 },
    VOL_TANK_RES: { low: 50, high: 200 },
    VOL_TOTAL_ACT: { low: 300, high: 800 },
    VOL_TOTAL_LOD_BOMB: { low: 0, high: 10000 },
    TOTAL_PUMP_VOL: { low: 0, high: 10000 },
    GAIN_LOSS: { low: -5, high: 5 },

    // Gases
    TOTAL_GAS: { low: 20, high: 80 },
    METHANE_C1: { low: 10, high: 40 },
    ETHANE_C2: { low: 5, high: 15 },
    PROPANE_C3: { low: 2, high: 8 },
    ISOBUTANE_C4I: { low: 1, high: 4 },
    NOR_BUT_C4N: { low: 1, high: 4 },
    NOR_PENTANE: { low: 0.5, high: 2.5 },
    ISO_PENT_C5I: { low: 0.5, high: 2.5 },
    H2S: { low: 2, high: 5 },
    CARB_DIOX: { low: 1, high: 3 },

    // Tiempos
    BIT_DR_TIME: { low: 0, high: 500 },
    LAG_TIME: { low: 5, high: 30 },
    LAG_DEPTH: { low: 0, high: 1000 },
    LAG_STROKES: { low: 0, high: 10000 },
    TOTAL_STK: { low: 0, high: 1000000 },
    P_STK_C_B_1: { low: 0, high: 100000 },
    P_STK_C_B_2: { low: 0, high: 100000 },
    P_STK_C_B_3: { low: 0, high: 100000 },
  };

  // Mapeo de unidades basado en el codeMap
  const unitsMap: Record<string, string> = {
    // Datos operacionales
    ROP: "m/h",
    WOB: "klb",
    PUMP_PRESSURE: "psi",
    PUMP_STK_R_1: "spm",
    PUMP_STK_R_2: "spm",
    PUMP_STK_R_3: "spm",
    HOOKLOAD: "klb",
    RPM: "rpm",
    ROT_TORQ_AMP: "A",
    RPM_MOTOR: "rpm",
    BIT_M_DEPTH: "m",
    TOT_M_DEPTH: "m",
    BLOCK_POSITION: "m",
    MUD_FLOW_IN: "lpm",
    MUD_FLOW_OUT_PER: "%",
    MUD_DEN_OUT: "kg/m³",
    MUD_TEMP_OUT: "°C",
    BIT_DR_TIME: "hours",

    // Volúmenes
    VOL_TANK_INT: "m³",
    VOL_TANK_SUCCION: "m³",
    VOL_TANK_RET: "m³",
    VOL_TANK_RES: "m³",
    VOL_TOTAL_ACT: "m³",
    VOL_TOTAL_LOD_BOMB: "m³",
    TOTAL_PUMP_VOL: "m³",
    GAIN_LOSS: "m³",

    // Gases
    TOTAL_GAS: "ppm",
    METHANE_C1: "ppm",
    ETHANE_C2: "ppm",
    PROPANE_C3: "ppm",
    ISOBUTANE_C4I: "ppm",
    NOR_BUT_C4N: "ppm",
    NOR_PENTANE: "ppm",
    ISO_PENT_C5I: "ppm",
    H2S: "ppm",
    CARB_DIOX: "ppm",

    // Tiempos y conteos
    LAG_TIME: "min",
    LAG_DEPTH: "m",
    LAG_STROKES: "strokes",
    TOTAL_STK: "strokes",
    P_STK_C_B_1: "strokes",
    P_STK_C_B_2: "strokes",
    P_STK_C_B_3: "strokes",

    // Desconocidos
    UNKN_1: "m",
    UNKN_2: "m",
    UNKN_3: "m",
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
      PUMP_STK_R_1: "PUMP STROKE RATE 1",
      PUMP_STK_R_2: "PUMP STROKE RATE 2",
      PUMP_STK_R_3: "PUMP STROKE RATE 3",
      HOOKLOAD: "HOOKLOAD",
      RPM: "RPM",
      ROT_TORQ_AMP: "ROTARY TORQUE",
      RPM_MOTOR: "MOTOR RPM",
      BIT_M_DEPTH: "BIT DEPTH",
      TOT_M_DEPTH: "TOTAL DEPTH",
      BLOCK_POSITION: "BLOCK POSITION",
      MUD_FLOW_IN: "MUD FLOW IN",
      MUD_FLOW_OUT_PER: "MUD FLOW OUT %",
      MUD_DEN_OUT: "MUD DENSITY OUT",
      MUD_TEMP_OUT: "MUD TEMP OUT",
      BIT_DR_TIME: "BIT DRILL TIME",

      // Volúmenes
      VOL_TANK_INT: "TANK INTERMEDIO",
      VOL_TANK_SUCCION: "TANK SUCCION",
      VOL_TANK_RET: "TANK RETORNO",
      VOL_TANK_RES: "TANK RESERVA",
      VOL_TOTAL_ACT: "TOTAL VOL ACT",
      VOL_TOTAL_LOD_BOMB: "TOTAL LODO BOMB",
      TOTAL_PUMP_VOL: "TOTAL PUMPED VOL",
      GAIN_LOSS: "GAIN/LOSS",

      // Gases
      TOTAL_GAS: "TOTAL GAS",
      METHANE_C1: "METHANE C1",
      ETHANE_C2: "ETHANE C2",
      PROPANE_C3: "PROPANE C3",
      ISOBUTANE_C4I: "ISOBUTANE C4I",
      NOR_BUT_C4N: "NOR BUTANE C4N",
      NOR_PENTANE: "NOR PENTANE",
      ISO_PENT_C5I: "ISO PENTANE C5I",
      H2S: "H2S",
      CARB_DIOX: "CO2",

      // Tiempos y conteos
      LAG_TIME: "LAG TIME",
      LAG_DEPTH: "LAG DEPTH",
      LAG_STROKES: "LAG STROKES",
      TOTAL_STK: "TOTAL STROKES",
      P_STK_C_B_1: "STROKES BOMBA 1",
      P_STK_C_B_2: "STROKES BOMBA 2",
      P_STK_C_B_3: "STROKES BOMBA 3",

      // Desconocidos
      UNKN_1: "UNKNOWN 1",
      UNKN_2: "UNKNOWN 2",
      UNKN_3: "UNKNOWN 3",
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
          id: "ROT_TORQ_AMP",
          name: getDisplayName("ROT_TORQ_AMP"),
          value: indicators.ROT_TORQ_AMP || 0,
          unit: unitsMap.ROT_TORQ_AMP || "",
        },
        {
          id: "RPM_MOTOR",
          name: getDisplayName("RPM_MOTOR"),
          value: indicators.RPM_MOTOR || 0,
          unit: unitsMap.RPM_MOTOR || "",
        },
        {
          id: "BIT_M_DEPTH",
          name: getDisplayName("BIT_M_DEPTH"),
          value: indicators.BIT_M_DEPTH || 0,
          unit: unitsMap.BIT_M_DEPTH || "",
        },
        {
          id: "TOT_M_DEPTH",
          name: getDisplayName("TOT_M_DEPTH"),
          value: indicators.TOT_M_DEPTH || 0,
          unit: unitsMap.TOT_M_DEPTH || "",
        },
        {
          id: "BLOCK_POSITION",
          name: getDisplayName("BLOCK_POSITION"),
          value: indicators.BLOCK_POSITION || 0,
          unit: unitsMap.BLOCK_POSITION || "",
        },
        {
          id: "BIT_DR_TIME",
          name: getDisplayName("BIT_DR_TIME"),
          value: indicators.BIT_DR_TIME || 0,
          unit: unitsMap.BIT_DR_TIME || "",
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
          id: "PUMP_STK_R_1",
          name: getDisplayName("PUMP_STK_R_1"),
          value: indicators.PUMP_STK_R_1 || 0,
          unit: unitsMap.PUMP_STK_R_1 || "",
        },
        {
          id: "PUMP_STK_R_2",
          name: getDisplayName("PUMP_STK_R_2"),
          value: indicators.PUMP_STK_R_2 || 0,
          unit: unitsMap.PUMP_STK_R_2 || "",
        },
        {
          id: "PUMP_STK_R_3",
          name: getDisplayName("PUMP_STK_R_3"),
          value: indicators.PUMP_STK_R_3 || 0,
          unit: unitsMap.PUMP_STK_R_3 || "",
        },
        {
          id: "MUD_FLOW_IN",
          name: getDisplayName("MUD_FLOW_IN"),
          value: indicators.MUD_FLOW_IN || 0,
          unit: unitsMap.MUD_FLOW_IN || "",
        },
        {
          id: "MUD_FLOW_OUT_PER",
          name: getDisplayName("MUD_FLOW_OUT_PER"),
          value: indicators.MUD_FLOW_OUT_PER || 0,
          unit: unitsMap.MUD_FLOW_OUT_PER || "",
        },
        {
          id: "MUD_DEN_OUT",
          name: getDisplayName("MUD_DEN_OUT"),
          value: indicators.MUD_DEN_OUT || 0,
          unit: unitsMap.MUD_DEN_OUT || "",
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
          id: "VOL_TANK_INT",
          name: getDisplayName("VOL_TANK_INT"),
          value: indicators.VOL_TANK_INT || 0,
          unit: unitsMap.VOL_TANK_INT || "",
        },
        {
          id: "VOL_TANK_SUCCION",
          name: getDisplayName("VOL_TANK_SUCCION"),
          value: indicators.VOL_TANK_SUCCION || 0,
          unit: unitsMap.VOL_TANK_SUCCION || "",
        },
        {
          id: "VOL_TANK_RET",
          name: getDisplayName("VOL_TANK_RET"),
          value: indicators.VOL_TANK_RET || 0,
          unit: unitsMap.VOL_TANK_RET || "",
        },
        {
          id: "VOL_TANK_RES",
          name: getDisplayName("VOL_TANK_RES"),
          value: indicators.VOL_TANK_RES || 0,
          unit: unitsMap.VOL_TANK_RES || "",
        },
        {
          id: "VOL_TOTAL_ACT",
          name: getDisplayName("VOL_TOTAL_ACT"),
          value: indicators.VOL_TOTAL_ACT || 0,
          unit: unitsMap.VOL_TOTAL_ACT || "",
        },
        {
          id: "VOL_TOTAL_LOD_BOMB",
          name: getDisplayName("VOL_TOTAL_LOD_BOMB"),
          value: indicators.VOL_TOTAL_LOD_BOMB || 0,
          unit: unitsMap.VOL_TOTAL_LOD_BOMB || "",
        },
        {
          id: "TOTAL_PUMP_VOL",
          name: getDisplayName("TOTAL_PUMP_VOL"),
          value: indicators.TOTAL_PUMP_VOL || 0,
          unit: unitsMap.TOTAL_PUMP_VOL || "",
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
          id: "NOR_BUT_C4N",
          name: getDisplayName("NOR_BUT_C4N"),
          value: indicators.NOR_BUT_C4N || 0,
          unit: unitsMap.NOR_BUT_C4N || "",
        },
        {
          id: "NOR_PENTANE",
          name: getDisplayName("NOR_PENTANE"),
          value: indicators.NOR_PENTANE || 0,
          unit: unitsMap.NOR_PENTANE || "",
        },
        {
          id: "ISO_PENT_C5I",
          name: getDisplayName("ISO_PENT_C5I"),
          value: indicators.ISO_PENT_C5I || 0,
          unit: unitsMap.ISO_PENT_C5I || "",
        },
        {
          id: "H2S",
          name: getDisplayName("H2S"),
          value: indicators.H2S || 0,
          unit: unitsMap.H2S || "",
        },
        {
          id: "CARB_DIOX",
          name: getDisplayName("CARB_DIOX"),
          value: indicators.CARB_DIOX || 0,
          unit: unitsMap.CARB_DIOX || "",
        },
      ],
    },
    {
      id: "counts",
      name: "Counts & Times",
      icon: <Clock className="h-4 w-4" />,
      indicators: [
        {
          id: "TOTAL_STK",
          name: getDisplayName("TOTAL_STK"),
          value: indicators.TOTAL_STK || 0,
          unit: unitsMap.TOTAL_STK || "",
        },
        {
          id: "P_STK_C_B_1",
          name: getDisplayName("P_STK_C_B_1"),
          value: indicators.P_STK_C_B_1 || 0,
          unit: unitsMap.P_STK_C_B_1 || "",
        },
        {
          id: "P_STK_C_B_2",
          name: getDisplayName("P_STK_C_B_2"),
          value: indicators.P_STK_C_B_2 || 0,
          unit: unitsMap.P_STK_C_B_2 || "",
        },
        {
          id: "P_STK_C_B_3",
          name: getDisplayName("P_STK_C_B_3"),
          value: indicators.P_STK_C_B_3 || 0,
          unit: unitsMap.P_STK_C_B_3 || "",
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
          id: "UNKN_1",
          name: getDisplayName("UNKN_1"),
          value: indicators.UNKN_1 || 0,
          unit: unitsMap.UNKN_1 || "",
        },
        {
          id: "UNKN_2",
          name: getDisplayName("UNKN_2"),
          value: indicators.UNKN_2 || 0,
          unit: unitsMap.UNKN_2 || "",
        },
        {
          id: "UNKN_3",
          name: getDisplayName("UNKN_3"),
          value: indicators.UNKN_3 || 0,
          unit: unitsMap.UNKN_3 || "",
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

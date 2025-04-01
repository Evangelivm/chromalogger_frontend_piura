"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from "react";
import { useSocket } from "@/socket";

export default function WITSInterface() {
  const [sections, setSections] = useState<string[][]>([]);
  const [witsmlSections, setWitsmlSections] = useState<string[]>([]);
  const witsEndRef = useRef<HTMLDivElement>(null);
  const witsmlEndRef = useRef<HTMLDivElement>(null);

  // Function to process raw WITS data into array
  const processRawData = (raw: string) => {
    return raw.split("\r\n").filter((line) => line.length > 0);
  };

  // Function to format XML for display
  const formatXml = (xml: string) => {
    let formatted = "";
    let indent = "";
    const tab = "  ";

    xml.split(/>\s*</).forEach((node) => {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }

      formatted += indent + "<" + node + ">\n";

      if (node.match(/^<?\w[^>]*[^/]$/) && !node.startsWith("</")) {
        indent += tab;
      }
    });

    return formatted.substring(0, formatted.length - 1);
  };

  // Auto scroll effect
  useEffect(() => {
    witsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sections]);

  useEffect(() => {
    witsmlEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [witsmlSections]);

  // Usar el hook useSocket para recibir datos en tiempo real
  useSocket(
    "sensorData",
    (data: { raw: string; dataGroup: Array<{ data: string }> }) => {
      // Process WITS In data
      const witsInData = processRawData(data.raw);
      const newSection: string[] = [];

      witsInData.forEach((item) => {
        newSection.push(item);
      });

      // Add new section to history, keeping only last 100 sections
      setSections((prevSections) => {
        const updatedSections = [...prevSections, newSection];
        return updatedSections.slice(-100); // Keep last 100 sections
      });

      // Update WITSML data with history
      const newWitsmlData = data.dataGroup.map((group) => group.data);
      setWitsmlSections((prevWitsml) => {
        const updatedWitsml = [...prevWitsml, ...newWitsmlData];
        return updatedWitsml.slice(-100); // Keep last 100 WITSML entries
      });
    }
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-900 h-screen">
      {/* WITS In Panel */}
      <Card className="flex-1 border-0 shadow-md overflow-hidden flex flex-col bg-gray-800 border-gray-700">
        <CardHeader className="bg-gray-950 text-gray-100 py-2 px-4 border-b border-gray-700">
          <CardTitle className="text-sm font-medium">WITS0</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[calc(100vh-100px)] w-full bg-gray-800">
            <div className="p-0">
              {sections.map((section, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className="border-b border-gray-700 last:border-b-0"
                >
                  {section.map((item, itemIndex) => (
                    <div
                      key={`${sectionIndex}-${itemIndex}`}
                      className={`px-4 py-0.5 text-sm font-mono ${
                        item === "&&" || item === "||" || item === "!!"
                          ? "text-green-400 font-semibold"
                          : "text-gray-300"
                      } ${
                        item === "||" || item === "!!"
                          ? "pb-1"
                          : item === "&&"
                          ? "pt-1"
                          : ""
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ))}
              <div ref={witsEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* WITS Out Panel */}
      <Card className="flex-1 border-0 shadow-md overflow-hidden flex flex-col bg-gray-800 border-gray-700">
        <CardHeader className="bg-gray-950 text-gray-100 py-2 px-4 border-b border-gray-700">
          <CardTitle className="text-sm font-medium">WITSML</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[calc(100vh-100px)] w-full bg-gray-800">
            <div className="p-0">
              {witsmlSections.map((xml, index) => (
                <div
                  key={index}
                  className="mb-4 border-b border-gray-700 last:border-b-0 pb-4"
                >
                  <pre className="text-xl font-mono px-4 py-3 overflow-x-auto whitespace-pre-wrap">
                    {xml.split(/<([^>]*)>/g).map((part, i) => {
                      if (i % 2 === 0) {
                        return part;
                      } else {
                        if (part.startsWith("/")) {
                          return (
                            <span key={i} className="text-red-400">
                              &lt;{part}&gt;
                            </span>
                          );
                        } else if (part.endsWith("/")) {
                          return (
                            <span key={i} className="text-blue-400">
                              &lt;{part}&gt;
                            </span>
                          );
                        } else {
                          const parts = part.split(" ");
                          const tagName = parts[0];
                          const attributes = part.substring(tagName.length);

                          return (
                            <span key={i}>
                              <span className="text-blue-400">
                                &lt;{tagName}
                              </span>
                              {attributes && (
                                <span className="text-yellow-400">
                                  {attributes}
                                </span>
                              )}
                              <span className="text-blue-400">&gt;</span>
                            </span>
                          );
                        }
                      }
                    })}
                  </pre>
                </div>
              ))}
              <div ref={witsmlEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

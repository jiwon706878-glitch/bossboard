"use client";

import { useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, QrCode, Star } from "lucide-react";
import { toast } from "sonner";

const platformTemplates = [
  {
    value: "google",
    label: "Google Reviews",
    urlTemplate: "https://search.google.com/local/writereview?placeid=",
    placeholder: "Enter your Google Place ID",
  },
  {
    value: "yelp",
    label: "Yelp",
    urlTemplate: "https://www.yelp.com/writeareview/biz/",
    placeholder: "Enter your Yelp Business ID",
  },
  {
    value: "facebook",
    label: "Facebook",
    urlTemplate: "https://www.facebook.com//reviews/",
    placeholder: "Enter your Facebook page URL",
  },
  {
    value: "tripadvisor",
    label: "TripAdvisor",
    urlTemplate: "",
    placeholder: "Enter your TripAdvisor review URL",
  },
  {
    value: "custom",
    label: "Custom URL",
    urlTemplate: "",
    placeholder: "Enter any URL",
  },
];

export default function QRCodePage() {
  const [platform, setPlatform] = useState("google");
  const [url, setUrl] = useState("");
  const [customText, setCustomText] = useState("");
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const selectedPlatform = platformTemplates.find((p) => p.value === platform);

  function handleGenerate() {
    if (!url.trim()) {
      toast.error("Please enter a URL or ID");
      return;
    }
    setGenerated(true);
  }

  const getFullUrl = useCallback(() => {
    if (platform === "custom" || platform === "tripadvisor" || platform === "facebook") {
      return url;
    }
    const template = selectedPlatform?.urlTemplate || "";
    return url.startsWith("http") ? url : template + url;
  }, [platform, url, selectedPlatform]);

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    // Create a new canvas with text below
    const padding = 40;
    const textHeight = customText ? 60 : 0;
    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width + padding * 2;
    newCanvas.height = canvas.height + padding * 2 + textHeight;

    const ctx = newCanvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // Draw QR code
    ctx.drawImage(canvas, padding, padding);

    // Draw custom text
    if (customText) {
      ctx.fillStyle = "#333333";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        customText,
        newCanvas.width / 2,
        canvas.height + padding + 35
      );
    }

    // Download
    const link = document.createElement("a");
    link.download = `qr-code-${currentBusiness?.name || "review"}.png`;
    link.href = newCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded!");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        <p className="text-muted-foreground">
          Create QR codes for your review pages. Print them on receipts, menus,
          or table tents to collect more reviews.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" /> Generate QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Review Platform</Label>
            <Select value={platform} onValueChange={(v) => { setPlatform(v); setGenerated(false); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platformTemplates.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{platform === "custom" ? "URL" : "Review Page URL or ID"}</Label>
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setGenerated(false); }}
              placeholder={selectedPlatform?.placeholder}
            />
            {platform === "google" && (
              <p className="text-xs text-muted-foreground">
                Find your Place ID at{" "}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Google Place ID Finder
                </a>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Custom Text Below QR (optional)</Label>
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={`e.g., Scan to review ${currentBusiness?.name || "us"}!`}
            />
          </div>
          <Button onClick={handleGenerate} disabled={!url.trim()}>
            <Star className="mr-2 h-4 w-4" />
            Generate QR Code (Free)
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle>Your QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div
              ref={canvasRef}
              className="rounded-lg border bg-white p-6"
            >
              <QRCodeCanvas
                value={getFullUrl()}
                size={256}
                level="H"
                marginSize={2}
                fgColor="#1a1a1a"
                bgColor="#ffffff"
              />
            </div>
            {customText && (
              <p className="text-sm font-medium text-muted-foreground">
                {customText}
              </p>
            )}
            <p className="text-xs text-muted-foreground break-all text-center max-w-md">
              {getFullUrl()}
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

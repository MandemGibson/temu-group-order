import React, { useState, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { api } from "../api/client";
import { toast } from "sonner";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  placeholder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  folder = "general",
  label = "Upload Screenshot / Proof",
  placeholder = "Drag and drop an image or click to browse",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    setIsUploading(true);
    try {
      const res = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data && res.data.url) {
        onChange(res.data.url);
        toast.success("Image uploaded successfully to Cloudinary!");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 transition-all duration-200">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-44 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition-colors"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Uploaded</span>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            dragActive
              ? "border-[#fb5814] bg-orange-50/50 scale-[1.01]"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2 text-[#fb5814]">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-bold">Uploading to Cloudinary...</span>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-orange-100 text-[#fb5814]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{placeholder}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Supports PNG, JPG, WebP up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

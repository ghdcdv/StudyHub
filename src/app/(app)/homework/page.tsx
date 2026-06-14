import { UploadForm } from "@/components/upload-form";

export default function HomeworkPage() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Homework Scanner
        </p>
        <h2 className="mt-1 text-3xl font-black">Upload a worksheet or question</h2>
      </div>
      <UploadForm
        endpoint="/api/homework/scan"
        label="JPG, PNG, WEBP, or PDF"
        accept="image/jpeg,image/png,image/webp,application/pdf"
      />
    </div>
  );
}

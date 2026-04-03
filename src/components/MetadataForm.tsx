interface Props {
  title: string;
  caption: string;
  hashtags: string;
  onTitleChange: (v: string) => void;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
}

export function MetadataForm({
  title,
  caption,
  hashtags,
  onTitleChange,
  onCaptionChange,
  onHashtagsChange,
}: Props) {
  return (
    <div className="card space-y-4">
      <div>
        <label className="label">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input"
          placeholder="Video title (for YouTube)"
          maxLength={100}
        />
      </div>

      <div>
        <label className="label">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          className="input min-h-[80px] resize-y"
          placeholder="Write your caption..."
          maxLength={2200}
        />
        <p className="text-xs text-gray-600 mt-1">{caption.length}/2200</p>
      </div>

      <div>
        <label className="label">Hashtags</label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => onHashtagsChange(e.target.value)}
          className="input"
          placeholder="#viral #fyp #trending (space or comma separated)"
        />
      </div>
    </div>
  );
}

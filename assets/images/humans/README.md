# Human imagery

These decorative photographs were selected from the user-supplied Microsoft human-assets collection. They are not portraits of named portal contributors.

| Source file | Optimized source | Use |
| --- | --- | --- |
| `CLO25-SCI-Lifestyle-057.jpg` | `welcome.jpg` | Community-team introduction |
| `CLO25-SCI-Lifestyle-006.jpg` | `sharing.jpg` | Community publishing invitation |
| `CLO24-Portraits-075.jpg` | `together.jpg` | Hero welcome |
| `CLO24-Portraits-046.jpg` | `demo.jpg` | Demo-volunteer invitation |
| `CLO24-Portraits-126.jpg` | `meet.jpg` | In-person community events |

The original photographs remain outside the repository. These compact JPEG masters have a maximum edge of 1280 pixels, JPEG quality 86-88, and no copied EXIF metadata. Keep these masters so a clean clone can reproduce the image variants without the original multi-megabyte files.

The shared Hugo partial generates three responsive JPEG candidates using the existing image-processing pipeline. It uses explicit dimensions, `srcset`, and layout-specific `sizes`; below-the-fold photographs are lazy-loaded. Generated image caches are ignored.

Do not describe stock-photo subjects as actual authors, coordinators, speakers, or community members. The decorative images use empty alternative text and are excluded from the accessibility tree. Existing, metadata-backed coordinator portraits remain unchanged.

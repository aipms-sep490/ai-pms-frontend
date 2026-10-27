# Department urgent queue: constrain the mobile grid track

The real Staff workspace rendered a1045px document on a390px viewport when its attention queue included the long seeded project title SEP490-FA26-SE01. The queue used a grid with no explicit column track below `lg`; the implicit auto track expanded to the card's intrinsic text width despite the inner title's truncation.

Define one bounded column below `lg`, preserving the existing two-column desktop layout. No content is hidden to mask overflow and no route, API or authority changes. Browser verification uses the real long-title project at390/768/1280/1440; typecheck/lint/build and relevant workspace tests are recorded in the G10 report.

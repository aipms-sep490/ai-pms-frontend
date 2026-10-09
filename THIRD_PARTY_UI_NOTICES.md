# UI references and adapted components

## Motion

Installed `motion` 14.0.0 using the project's pnpm lockfile. `useEntranceMotion` uses the small `motion/react-mini` API for page, dialog and drawer entrances. Source and documentation: https://motion.dev/docs/react-reduce-bundle-size. Package license: MIT (declared in the installed package metadata).

The entrance hook is independently written. React Bits FadeContent was reviewed for the content-reveal pattern; its GSAP implementation was not copied.

## React Bits — SpotlightCard

`src/components/ui/SpotlightLink.tsx` and the spotlight rules in `interaction-polish.css` adapt the pointer-position and radial spotlight implementation to a semantic router link, the application's light theme, and reduced-motion support.

Source: https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/SpotlightCard

MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Uiverse — arrow button reference

The existing application action-link styles use an independently written, restrained arrow movement inspired by https://uiverse.io/alexmaracinaru/brown-bobcat-65 by Alex Maracinaru. No original button markup or CSS was copied; this reference informs the interaction treatment, adapted to the current colors, icons, focus states, and reduced-motion preference.

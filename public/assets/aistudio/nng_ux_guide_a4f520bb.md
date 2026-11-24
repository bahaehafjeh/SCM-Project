# Practical UX Guide Based on Nielsen Norman Group Resources
**Categorized English summary | October 2026**

This document is an educational summary and paraphrase, not a full translation of the linked articles. Consult the original sources for details and examples. Duplicate items from the original list are included only once.

## Contents
1. Usability principles
2. Research and mapping
3. UI components and interaction patterns
4. Information architecture and navigation
5. Visual design and data
6. Mobile, omnichannel experiences, and ethics
7. Practical checklists
8. Reference library

---

# 1. Usability Principles

## Nielsen’s 10 Usability Heuristics
[Source](https://www.nngroup.com/articles/ten-usability-heuristics/)

1. **Visibility of system status:** Provide timely feedback after an action.
2. **Match between the system and the real world:** Use familiar language and concepts.
3. **User control and freedom:** Provide cancel, back, exit, and undo options.
4. **Consistency and standards:** Keep similar behaviors and labels consistent.
5. **Error prevention:** Eliminate predictable errors before they occur.
6. **Recognition rather than recall:** Make relevant options and information visible when needed.
7. **Flexibility and efficiency of use:** Make the main path clear for beginners and provide shortcuts for experienced users.
8. **Aesthetic and minimalist design:** Remove irrelevant information so important content stands out.
9. **Help users recognize, diagnose, and recover from errors:** Explain the problem and its remedy in clear language.
10. **Help and documentation:** Make help concise, searchable, and available when needed.

During an evaluation, ask: Is the current state clear? Can users go back? Are labels familiar? Could the error have been prevented? Record each finding with its location, evidence, impact, severity, and a proposed fix.

## Heuristic Evaluation
[How to Conduct a Heuristic Evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) · [Usability Problems Found by Heuristic Evaluation](https://www.nngroup.com/articles/usability-problems-found-by-heuristic-evaluation/) · [Heuristics for VR](https://www.nngroup.com/articles/usability-heuristics-virtual-reality/)

A typical process: define the scope and scenarios → have multiple evaluators review independently, when possible → record each issue and the relevant heuristic → prioritize by impact → fix and validate. A useful finding template includes location, problematic behavior, violated principle, evidence, impact, severity, and recommendation. Heuristic evaluation does not replace user testing; validate important findings through user observation or behavioral data. In VR, adapt general principles to spatial interaction and movement.

## Interaction Laws and Principles
- [Tesler’s Law](https://www.nngroup.com/videos/teslers-law/): Inherent complexity cannot always be eliminated; design determines whether the system or the user handles it. Automate repetitive work, but do not take preference-dependent decisions away from users.
- [Jakob’s Law](https://www.nngroup.com/videos/jakobs-law-internet-ux/): Users bring expectations from other products. Familiar patterns reduce learning costs; departures from convention should provide a clear benefit.
- [Fitts’s Law](https://www.nngroup.com/videos/fittss-law-links-buttons/): Larger, closer targets are easier to select. Consider target size, spacing, and thumb reach.
- [Learnability and Efficiency](https://www.nngroup.com/videos/learnability-efficiency-ui-design/): Keep the primary path clear for new users while giving experienced users efficient shortcuts.
- [Firm Rules vs. Balancing Goals](https://www.nngroup.com/videos/firm-rules-ux-vs-balancing-goals/): Distinguish non-negotiable requirements from goals that must be balanced, such as speed and simplicity.

---

# 2. Research and Mapping

## Usability Testing
[Usability Testing 101](https://www.nngroup.com/articles/usability-testing-101/)

Observe representative users performing realistic tasks to understand where and why they struggle. Define the research question and the decision the study must inform; recruit suitable participants; write goal-oriented scenarios; run a pilot; observe neutrally; and record task success, hesitation, errors, and requests for help. Describe tasks in terms of goals, not click-by-click instructions. Avoid coaching participants or asking leading questions. Findings should include the problem, evidence, impact, severity, and a testable recommendation. A small qualitative sample does not guarantee statistical representativeness.

## Design Thinking
[Design Thinking 101](https://www.nngroup.com/articles/design-thinking/)

A human-centered, iterative approach: understand the context, define the problem, ideate, prototype, and test. These stages are not strictly linear. Define the problem using evidence, generate multiple ideas, test assumptions with low-cost prototypes, and iterate based on what you learn. A viable solution should be desirable to users, technically feasible, and sustainable for the organization.

## Journey Mapping
[Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/) · [Research for Journey Mapping](https://www.nngroup.com/articles/research-journey-mapping/)

A journey map shows a user’s experience over time and across channels. Common elements include the actor, scenario or goal, stages, actions, touchpoints, thoughts and feelings, pain points, opportunities, and supporting evidence. Draw on interviews, observation, behavioral data, and customer support records. Connect friction points to actions, owners, and success metrics. Distinguish hypotheses from verified findings. Interviews, field observation, and diary studies can help capture the experience.

## Empathy Mapping
[Empathy Mapping](https://www.nngroup.com/articles/empathy-mapping/)

The four quadrants are **Says** (actual statements), **Thinks** (inferences), **Does** (observed behavior), and **Feels** (feelings inferred from evidence). Record the source of each item and do not confuse interpretation with fact. An empathy map does not replace interviews or observation.

## Mental Models
[Mental Models](https://www.nngroup.com/articles/mental-models/)

A mental model is a user’s explanation of how a system works. A mismatch between the user’s model and the product’s model can create confusion. Use familiar language, clear mappings between controls and outcomes, and useful feedback. Ask how people currently approach the task and observe what they actually do.

## Storyboards
[Storyboards Help Visualize Ideas](https://www.nngroup.com/articles/storyboards-visualize-ideas/)

A storyboard shows the sequence of context, need, action, interaction, and outcome. Depict the real-world context, not just a series of screens. Storyboards help align a team, but do not prove that a solution will work.

## Study Guides
[Web UX Study Guide](https://www.nngroup.com/articles/web-ux-study-guide/) · [Mobile UX Study Guide](https://www.nngroup.com/articles/mobile-ux-study-guide/)

For web experiences, review information architecture, navigation, search, content, forms, trust, and accessibility. For mobile, consider limited space, touch interactions, input methods, permissions, connectivity, and one-handed use. Do not simply compress a desktop interface; prioritize tasks and account for offline or interrupted states.

## Progressive Enhancement and Design Guidance
[Enhancement](https://www.nngroup.com/articles/enhancement/) · [Design Guidance](https://www.nngroup.com/articles/design-guidance/) · [Design Pattern Guidelines](https://www.nngroup.com/articles/design-pattern-guidelines/)

Keep core functionality and essential content usable wherever possible, then layer advanced features on top. Principles provide direction; heuristics help identify problems; patterns suggest established solutions; and design systems establish implementation specifications. Do not copy a pattern without considering its context.

## UX Mapping Methods
[UX Mapping Methods Study Guide](https://www.nngroup.com/articles/ux-mapping-methods-study-guide/)

| Method | Purpose |
|---|---|
| Journey map | End-to-end experience over time |
| Empathy map | Organize observations about a user |
| Storyboard | Illustrate a scenario and an idea |
| Sitemap | Show content structure |
| Task flowchart | Show required steps and decisions |
| Service blueprint | Connect the customer experience to backstage operations |

---

# 3. UI Components and Interaction Patterns

## UI Elements Glossary
[UI Elements Glossary](https://www.nngroup.com/articles/ui-elements-glossary/)

Common families include input controls (text fields, checkboxes, radio buttons, selects, date pickers), actions (buttons and links), navigation (tabs, breadcrumbs, menus), status indicators (toasts and progress indicators), overlays (modals, popovers, tooltips), and content displays (cards, tables, accordions, charts). Choose a component based on the task it supports, not merely its appearance.

## Disabled Buttons
[Why Disabled Buttons Hurt UX](https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/)

A disabled button can hide why a user cannot proceed. Explain prerequisites near the control and show validation errors beside the relevant field. Disabling can be appropriate when an action is impossible or to prevent duplicate submissions, provided the state and reason are clear.

## Checkboxes
[Checkbox Design Guidelines](https://www.nngroup.com/videos/checkbox-design-guidelines/)

Checkboxes support independent selection of one or more options. A single choice from a set usually calls for radio buttons; an immediate on/off setting may be better served by a switch. Use clear labels, sufficiently large touch targets, and an unambiguous selected state.

## Error Messages
[Error Messages 101](https://www.nngroup.com/videos/error-messages-101/) · [Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)

Tell users what happened, how to fix it, and how to continue. Avoid unexplained technical codes and blame. Place the message near the relevant field and preserve valid input. Frequent errors may indicate a design flaw rather than a user problem.

## Microinteractions
[Microinteractions](https://www.nngroup.com/videos/microinteractions/)

Small interactions serve a focused purpose, such as confirming that content was saved or copied. Feedback should clarify the state rather than distract unnecessarily. Evaluate timing, reduced-motion behavior, and what happens when the interaction fails.

## Input Steppers
[Input Steppers](https://www.nngroup.com/articles/input-steppers/)

Steppers are useful when a value changes in defined increments. Direct entry may be better for large or precise values. Make minimums, maximums, step size, and boundary behavior clear.

## Tooltips
[Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/)

Tooltips work well for brief explanations of an icon or term, not for essential instructions or error messages. Touch users may not have hover, so never put essential information only in a tooltip. Check keyboard access and ensure the tooltip is positioned reliably.

## Drop-Down Menus
[Drop-Down Menus](https://www.nngroup.com/articles/drop-down-menus/)

Dropdowns save space but hide the available options. For a small set of familiar options, displaying choices directly may be faster. Long lists may need search or categorization; choose ordering and defaults carefully.

## Status Trackers
[Status Trackers](https://www.nngroup.com/videos/status-trackers/)

For a multi-step process, clearly show the current, completed, and remaining steps. Do not imply progress that has not occurred or present uncertain timing as precise. Make options for going back clear.

## Bulk Actions
[Bulk Actions](https://www.nngroup.com/videos/bulk-actions-design-guidelines/)

Show how many items are selected and the scope of the action. Distinguish “select this page” from “select all results.” Destructive operations may require proportionate confirmation or undo, and the interface should report the outcome.

## Tabs vs. Accordions
[Tabs vs. Accordions](https://www.nngroup.com/videos/tabs-vs-accordions/) · [Tabs Used Right](https://www.nngroup.com/articles/tabs-used-right/)

Tabs suit peer sections that share a context and are relatively independent; accordions expand and collapse sections within a page. Do not use tabs for sequential steps unless the step-by-step behavior is explicit. Check keyboard interaction and accessibility.

## Wizards
[Wizards](https://www.nngroup.com/articles/wizards/)

Wizards break a complex process into smaller steps. They help when steps depend on one another, but can slow down simple tasks or tasks that require free navigation. Make progress, back navigation, data retention, and the final review clear.

## Modal and Nonmodal Dialogs
[Modal and Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/)

A modal blocks interaction with the background and is appropriate only when interrupting the current flow is justified. Provide a clear title and exit, manage focus order correctly, and return focus when the dialog closes. Nonmodal interfaces are better when users need to work with other areas at the same time.

## Date Input
[Date Input](https://www.nngroup.com/articles/date-input/)

A calendar helps users browse a range or choose a nearby date; direct entry can sometimes be faster. Clarify date format, time zone, and constraints. Long calendar navigation can be inefficient for dates far in the past or future.

## Icons and Recommendations
[Icon Usability](https://www.nngroup.com/videos/icon-usability/) · [Recommendation Guidelines](https://www.nngroup.com/articles/recommendation-guidelines/)

Ambiguous icons force users to guess; retain text labels for important actions. Recommendations should be relevant, understandable, and controllable. Explain why an item is recommended when useful, and do not measure success by clicks alone.

## Footers, Tables of Contents, and Patterns
[Footers](https://www.nngroup.com/articles/footers/) · [Table of Contents](https://www.nngroup.com/articles/table-of-contents/) · [Design Pattern Guidelines](https://www.nngroup.com/articles/design-pattern-guidelines/)

A footer should provide useful supporting links, not become an unstructured dumping ground. A table of contents clarifies the structure of a long page. Design patterns are reusable solutions, not prescriptions to copy without considering the task and context.

---

# 4. Information Architecture and Navigation

## Information Architecture and Sitemaps
[Information Architecture: Sitemaps](https://www.nngroup.com/articles/information-architecture-sitemaps/) · [Site Map Usability](https://www.nngroup.com/articles/site-map-usability/) · [IA Study Guide](https://www.nngroup.com/articles/ia-study-guide/)

Information architecture (IA) defines how content is organized, labeled, and found. Inventory the content, understand users’ needs and language, design categories and labels, and test findability. Do not automatically turn the organization’s internal structure into the website’s structure.

## Flat vs. Deep Hierarchies
[Flat vs. Deep Hierarchies](https://www.nngroup.com/videos/flat-vs-deep-hierarchies/)

A flat hierarchy offers many choices at a shallow level; a deep hierarchy has more layers. Excessive depth increases navigation, while excessive breadth makes scanning difficult. Use findability testing to determine the right balance.

## Menus and Vertical Navigation
[Menu Design](https://www.nngroup.com/articles/menu-design/) · [Vertical Navigation](https://www.nngroup.com/articles/vertical-nav/)

Navigation should help users understand where they are and what to do next. Clear labels are preferable to creative but ambiguous names. Vertical navigation can suit a stable hierarchy, but it uses space and may need redesign on mobile.

## The Three-Click Rule
[3-Click Rule](https://www.nngroup.com/videos/3-click-rule/)

Click count alone is not a measure of quality. Predictable paths, clear labels, and an obvious next step matter more. One extra, clear click can be better than a shorter but confusing path.

## Breadcrumbs and Polyhierarchy
[Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/) · [Polyhierarchy](https://www.nngroup.com/articles/polyhierarchy/)

Breadcrumbs show hierarchical location and provide a way back; they do not replace primary navigation. In a polyhierarchy, content belongs to multiple categories. Stable identifiers and consistent paths help prevent ambiguity about a page’s location.

## Intranet IA, Phone Trees, and Context
[Intranet IA](https://www.nngroup.com/articles/intranet-information-architecture-ia/) · [Phone Tree Guidelines](https://www.nngroup.com/articles/phone-tree-guidelines/) · [Context and IA](https://www.nngroup.com/articles/context-architecture/)

Do not organize an intranet solely around the org chart; employee tasks, search, freshness, and content ownership matter. Phone trees should use a small number of plain-language options and should not hide the path to a human operator. IA should account for user context, goals, entry points, and devices.

---

# 5. Visual Design and Data

## Visual Design Principles
[Principles of Visual Design](https://www.nngroup.com/articles/principles-visual-design/) · [Visual Design Principles in Action](https://www.nngroup.com/videos/visual-design-principles-in-action/)

Hierarchy, alignment, contrast, proximity, repetition, whitespace, and balance should make structure easier to understand. Instead of saying a design “looks good,” explain which decisions improve scanning, prioritization, or error reduction.

## Design Analysis and Shortcuts
[Level Up Your Visual Design Skills](https://www.nngroup.com/videos/level-up-your-visual-design-skills/) · [Analyzing Good Designs](https://www.nngroup.com/videos/analyzing-good-designs/) · [Analyzing Figma’s Shortcut](https://www.nngroup.com/videos/analyzing-figmas-shortcut/)

Analyze an interface in relation to its goals and audience, then examine grid, typography, spacing, color, contrast, and behavior. A power-user shortcut should not be the only way to access an important feature. Study examples to extract reusable principles, not to copy their appearance.

## Glassmorphism, Liquid Glass, Flat Design, and Minimalism
[Glassmorphism](https://www.nngroup.com/articles/glassmorphism/) · [Liquid Glass](https://www.nngroup.com/articles/liquid-glass/) · [Flat Design](https://www.nngroup.com/articles/flat-design-best-practices/) · [Roots of Minimalism](https://www.nngroup.com/articles/roots-minimalism-web-design/)

Transparency and blur can create a sense of depth, but may reduce readability and make control boundaries harder to perceive. Flat design can make buttons and text look too similar. Preserve contrast, focus indicators, labels, and feedback. Minimalism means removing the unnecessary—not removing needed guidance or signifiers.

## Forms and Whitespace
[Form Design: White Space](https://www.nngroup.com/articles/form-design-white-space/)

Keep related elements close together and separate groups so the relationship between labels and fields is clear. Both excessive density and excessive spacing can make the structure harder to understand.

## Dark Mode
[Dark Mode](https://www.nngroup.com/articles/dark-mode-users-issues/)

Dark mode is not automatically more readable. Check contrast, font weight, semantic colors, and charts in both themes. Consider system preferences and allow users to choose when appropriate.

## Charts and Dashboards
[Choosing Chart Types](https://www.nngroup.com/videos/choosing-chart-types/) · [Data Visualizations and Dashboards](https://www.nngroup.com/videos/data-visualizations-dashboards/) · [Dashboards and Preattentive Processing](https://www.nngroup.com/articles/dashboards-preattentive/)

Use bars to compare categories, lines to show change over time, scatter plots to show relationships between two variables, and histograms to show distributions. Use pie charts only when there are few parts to compare. Make titles, units, scales, and time ranges explicit. Visual properties such as size and position guide attention; over-highlighting can undermine hierarchy.

## Animation, Maps, and Trends
[Animation for UX](https://www.nngroup.com/articles/animation-purpose-ux/) · [Visual Design and UX Maps](https://www.nngroup.com/videos/visual-design-ux-maps/) · [Cyclical Design Trends](https://www.nngroup.com/videos/cyclical-design-trends/)

Animation should explain a state change or spatial relationship rather than serve as decoration alone. Check duration and reduced-motion preferences. In UX maps, use color and size meaningfully, and do not make color the only carrier of information. Evaluate visual trends against user needs, accessibility, and maintenance cost—not popularity alone.

---

# 6. Mobile, Omnichannel Experiences, and Ethics

## Omnichannel Consistency
[Omnichannel Consistency](https://www.nngroup.com/articles/omnichannel-consistency/)

Consistency across the web, app, store, and support channels is more than visual similarity: state, information, policies, and terminology should align. Check whether users must re-enter information and whether support staff can access the context of earlier interactions.

## Web Standards and Virtual Reality
[Web Design Standards](https://www.nngroup.com/articles/the-need-for-web-design-standards/) · [VR Heuristics](https://www.nngroup.com/articles/usability-heuristics-virtual-reality/)

Common web conventions reduce learning costs; departures should provide a clear, tested benefit. In VR, orientation, spatial feedback, physical comfort, and prevention of unintended movement are especially important.

## Ethics and User Autonomy
[Design Ethics in UX](https://www.nngroup.com/videos/design-ethics-ux/) · [Increase User Autonomy](https://www.nngroup.com/articles/increase-user-autonomy/) · [User Control and Freedom](https://www.nngroup.com/articles/user-control-and-freedom/)

Avoid hiding costs, making cancellation difficult, applying unnecessary pressure, or presenting deceptive choices. Defaults should be transparent and changeable; consequences should be explained; and exit or correction should be easy. Consider undo for reversible actions and explain consequences before irreversible actions.

## Help, Minimalism, and Error Prevention
[Help and Documentation](https://www.nngroup.com/videos/help-and-documentation/) · [Aesthetic and Minimalist Design](https://www.nngroup.com/videos/aesthetic-and-minimalist-design/) · [Error Prevention](https://www.nngroup.com/videos/usability-heuristic-error-prevention/)

Help should be task-oriented and available at the point of need. A recurring problem may reveal a design flaw. Minimalism should not remove essential information. Validate input, provide format examples, and explain the consequences of risky actions. Preventing the cause of an error is better than merely improving the error message.

---

# 7. Practical Checklists

## Before Shipping a UI
- [ ] The system’s state is clear after an action.
- [ ] Similar components behave and are labeled consistently.
- [ ] Cancel, back, and correction are available where needed.
- [ ] Predictable errors have been prevented.
- [ ] Error messages are clear and actionable.
- [ ] Visual hierarchy, contrast, and target sizes are appropriate.
- [ ] Loading, empty, success, error, disabled, and focus states are designed.
- [ ] Keyboard, screen-reader, and mobile behavior have been reviewed.

## Heuristic Evaluation
- [ ] Scope and scenarios are defined.
- [ ] Findings describe behavior and consequences, not personal taste.
- [ ] Evidence, relevant heuristic, and severity are recorded.
- [ ] Duplicate findings are consolidated.
- [ ] Priority reflects severity, frequency, reach, and risk.
- [ ] Important fixes have a validation plan.

## Usability Testing
- [ ] The research question and intended decision are clear.
- [ ] Participants match the target users.
- [ ] Tasks are goal-oriented rather than click instructions.
- [ ] Scenarios are realistic and do not lead participants.
- [ ] The moderator remains neutral.
- [ ] Success, errors, hesitation, and quotes are recorded.
- [ ] Findings are connected to decisions and next steps.

## Finding Template
```text
ID:
Title:
Page / step:
User goal:
Observation and evidence:
Related principle:
Impact:
Severity (critical / high / medium / low):
Frequency and reach:
Recommended fix:
Success metric and validation method:
Owner / status:
```

---

# 8. Reference Library

## Usability, Research, and Mapping
- [Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Heuristic Evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)
- [Usability Problems Found by Heuristic Evaluation](https://www.nngroup.com/articles/usability-problems-found-by-heuristic-evaluation/)
- [Tesler’s Law](https://www.nngroup.com/videos/teslers-law/)
- [Jakob’s Law](https://www.nngroup.com/videos/jakobs-law-internet-ux/)
- [Fitts’s Law](https://www.nngroup.com/videos/fittss-law-links-buttons/)
- [Learnability and Efficiency](https://www.nngroup.com/videos/learnability-efficiency-ui-design/)
- [Design Thinking](https://www.nngroup.com/articles/design-thinking/)
- [Usability Testing 101](https://www.nngroup.com/articles/usability-testing-101/)
- [Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/)
- [Empathy Mapping](https://www.nngroup.com/articles/empathy-mapping/)
- [Mental Models](https://www.nngroup.com/articles/mental-models/)
- [Storyboards](https://www.nngroup.com/articles/storyboards-visualize-ideas/)
- [Web UX Study Guide](https://www.nngroup.com/articles/web-ux-study-guide/)
- [Mobile UX Study Guide](https://www.nngroup.com/articles/mobile-ux-study-guide/)
- [Enhancement](https://www.nngroup.com/articles/enhancement/)
- [UX Mapping Methods](https://www.nngroup.com/articles/ux-mapping-methods-study-guide/)

## UI Components
- [UI Elements Glossary](https://www.nngroup.com/articles/ui-elements-glossary/)
- [Disabled Buttons](https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/)
- [Checkbox Guidelines](https://www.nngroup.com/videos/checkbox-design-guidelines/)
- [Error Messages 101](https://www.nngroup.com/videos/error-messages-101/)
- [Microinteractions](https://www.nngroup.com/videos/microinteractions/)
- [Input Steppers](https://www.nngroup.com/articles/input-steppers/)
- [Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/)
- [Drop-Down Menus](https://www.nngroup.com/articles/drop-down-menus/)
- [Status Trackers](https://www.nngroup.com/videos/status-trackers/)
- [Bulk Actions](https://www.nngroup.com/videos/bulk-actions-design-guidelines/)
- [Tabs vs. Accordions](https://www.nngroup.com/videos/tabs-vs-accordions/)
- [Tabs Used Right](https://www.nngroup.com/articles/tabs-used-right/)
- [Wizards](https://www.nngroup.com/articles/wizards/)
- [Modal and Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/)
- [Date Input](https://www.nngroup.com/articles/date-input/)
- [Icon Usability](https://www.nngroup.com/videos/icon-usability/)
- [Footers](https://www.nngroup.com/articles/footers/)
- [Recommendation Guidelines](https://www.nngroup.com/articles/recommendation-guidelines/)
- [Table of Contents](https://www.nngroup.com/articles/table-of-contents/)

## Information Architecture
- [IA Sitemaps](https://www.nngroup.com/articles/information-architecture-sitemaps/)
- [Site Map Usability](https://www.nngroup.com/articles/site-map-usability/)
- [IA Study Guide](https://www.nngroup.com/articles/ia-study-guide/)
- [Flat vs. Deep Hierarchies](https://www.nngroup.com/videos/flat-vs-deep-hierarchies/)
- [Menu Design](https://www.nngroup.com/articles/menu-design/)
- [Vertical Navigation](https://www.nngroup.com/articles/vertical-nav/)
- [3-Click Rule](https://www.nngroup.com/videos/3-click-rule/)
- [Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/)
- [Polyhierarchy](https://www.nngroup.com/articles/polyhierarchy/)
- [Intranet IA](https://www.nngroup.com/articles/intranet-information-architecture-ia/)
- [Phone Tree Guidelines](https://www.nngroup.com/articles/phone-tree-guidelines/)
- [Context and IA](https://www.nngroup.com/articles/context-architecture/)

## Visual Design and Omnichannel UX
- [Principles of Visual Design](https://www.nngroup.com/articles/principles-visual-design/)
- [Glassmorphism](https://www.nngroup.com/articles/glassmorphism/)
- [Liquid Glass](https://www.nngroup.com/articles/liquid-glass/)
- [Flat Design](https://www.nngroup.com/articles/flat-design-best-practices/)
- [Minimalism in Web Design](https://www.nngroup.com/articles/roots-minimalism-web-design/)
- [Form White Space](https://www.nngroup.com/articles/form-design-white-space/)
- [Dark Mode](https://www.nngroup.com/articles/dark-mode-users-issues/)
- [Animation for UX](https://www.nngroup.com/articles/animation-purpose-ux/)
- [Level Up Visual Design](https://www.nngroup.com/videos/level-up-your-visual-design-skills/)
- [Analyzing Good Designs](https://www.nngroup.com/videos/analyzing-good-designs/)
- [Visual Design Principles in Action](https://www.nngroup.com/videos/visual-design-principles-in-action/)
- [Cyclical Design Trends](https://www.nngroup.com/videos/cyclical-design-trends/)
- [Visual Design and UX Maps](https://www.nngroup.com/videos/visual-design-ux-maps/)
- [Choosing Chart Types](https://www.nngroup.com/videos/choosing-chart-types/)
- [Dashboards and Preattentive Processing](https://www.nngroup.com/articles/dashboards-preattentive/)
- [Data Visualizations and Dashboards](https://www.nngroup.com/videos/data-visualizations-dashboards/)
- [Omnichannel Consistency](https://www.nngroup.com/articles/omnichannel-consistency/)
- [Web Design Standards](https://www.nngroup.com/articles/the-need-for-web-design-standards/)
- [Design Ethics](https://www.nngroup.com/videos/design-ethics-ux/)
- [Increase User Autonomy](https://www.nngroup.com/articles/increase-user-autonomy/)
- [User Control and Freedom](https://www.nngroup.com/articles/user-control-and-freedom/)
- [Help and Documentation](https://www.nngroup.com/videos/help-and-documentation/)
- [Aesthetic and Minimalist Design](https://www.nngroup.com/videos/aesthetic-and-minimalist-design/)
- [Error Prevention](https://www.nngroup.com/videos/usability-heuristic-error-prevention/)
- [Suggested Readings — Don Norman](http://www.jnd.org/dn.mss/suggested_readings_f.html)
- [Top Articles of 2025](https://www.nngroup.com/articles/top-articles-2025/)

## Additional Recommended Resources
- [UX Research Methods](https://www.nngroup.com/topic/ux-research/)
- [User Interviews](https://www.nngroup.com/articles/user-interviews/)
- [Usability 101](https://www.nngroup.com/articles/usability-101-introduction-to-usability/)
- [Service Blueprints](https://www.nngroup.com/articles/service-blueprints-definition/)
- [Card Sorting](https://www.nngroup.com/articles/card-sorting-definition/)
- [Tree Testing](https://www.nngroup.com/articles/tree-testing/)

**Final note:** Use this guide for review and decision-making. For important decisions, read the original source and validate solutions with real users. No single principle or pattern replaces evidence, accessibility, and professional judgment.

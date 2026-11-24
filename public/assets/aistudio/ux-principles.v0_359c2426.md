# UX Principles & Product Design Standards
**Reference guide for user experience, interaction design, accessibility, and user-interface content**

- **Version:** 1.0
- **Status:** Draft organizational standard
- **Applies to:** Digital products, administrative tools, dashboards, and data-intensive applications
- **Audience:** Product designers, UX/UI designers, product managers, researchers, developers, and AI tools such as Claude Code

> This document is a decision-making and review guide. It does not replace user research, legal requirements, accessibility standards, or product-specific documentation.

## 1. Purpose and How to Use This Document

This document establishes shared principles and evaluation criteria for designing experiences that are understandable, usable, accessible, and trustworthy across the organization.

Use it to:
- Design user flows, information architecture, pages, and components.
- Review existing user experiences and interfaces.
- Write labels, buttons, messages, forms, and UI states.
- Evaluate accessibility, responsive behavior, and error handling.
- Guide AI tools when analyzing or generating designs and code.

### Source-of-Truth Priority

When sources conflict, follow this order:

1. Applicable laws and mandatory security, privacy, and accessibility requirements.
2. Approved product requirements and policies.
3. User-research evidence and reliable usage data.
4. The approved design system and organizational patterns.
5. The principles in this document and reputable UX guidance.
6. New hypotheses and proposals that still require validation.

UX principles are not absolute rules. A different decision can be appropriate when its rationale, impact, constraints, and validation approach are documented.

### Rules for AI-Assisted Work

- Distinguish observed facts, user quotes, hypotheses, and recommendations.
- Never invent metrics, research findings, product requirements, design tokens, or APIs.
- If evidence is insufficient, state uncertainty and open questions explicitly.
- Inspect the existing structure and code before proposing changes. Do not make broad or unrelated changes without authorization.
- For every issue, report its location, evidence, user impact, severity, recommendation, and validation method.
- Before introducing a new pattern, check whether an approved component or pattern already exists.

## 2. Foundational UX Principles

### 2.1 Start with the User's Problem and Task
- Identify user goals, context, constraints, and success criteria.
- Design around real tasks rather than a list of features.
- Use research, feedback, behavioral data, or traceable evidence for important decisions.
- Validate solutions with users or an appropriate evaluation method.

### 2.2 Evaluate Usability Across Multiple Dimensions
A good experience should be, as appropriate:
- **Effective:** Users can complete the correct task.
- **Efficient:** Unnecessary time and effort are minimized.
- **Learnable:** Users can understand how to get started.
- **Memorable:** Users can resume using the product after an interruption.
- **Error-tolerant:** Errors are prevented where possible and recoverable when they occur.
- **Satisfying and trustworthy:** Product behavior is understandable and predictable.
- **Accessible:** People with different abilities and interaction methods can use it.

### 2.3 Reduce Unnecessary Complexity, Not Essential Information
- Remove unnecessary steps, choices, and decisions.
- Group information according to priority and task.
- Use progressive disclosure for less-frequently-needed details when appropriate.
- Do not hide critical information or controls simply to make a screen look cleaner.

## 3. Nielsen Norman Group's 10 Usability Heuristics

### 3.1 Visibility of System Status
The system should communicate its state and the outcome of an action at an appropriate time.
- Show progress or a meaningful status for operations that take time.
- Provide clear feedback after saving, submitting, deleting, or changing something.
- In data-intensive products, show when data was last updated and whether it may be stale.
- Never show a success message for an operation that did not succeed.

**Review question:** Can users understand the system's current state and the result of their action?

### 3.2 Match Between the System and the Real World
Use language, categories, and sequences that are familiar to the intended audience.
- Choose terminology that matches users' roles and knowledge.
- Do not expose internal organizational jargon without explanation.
- Format dates, times, and units to fit the user's context and locale.

**Review question:** Can users understand the concept without mentally translating the system's language?

### 3.3 User Control and Freedom
Users should be able to leave an unintended path or reverse an action when possible.
- Provide suitable undo, cancel, or recovery options for reversible actions.
- For irreversible or high-impact actions, clearly explain the consequences.
- Do not unnecessarily clear user filters, selections, or edits.
- Make it reasonably easy to exit a workflow.

**Review question:** Can users recover from a mistake or exit a workflow without unreasonable cost?

### 3.4 Consistency and Standards
- Similar actions should behave and be named consistently across the product.
- Follow familiar platform conventions unless there is a documented reason not to.
- Reuse approved design-system tokens, components, states, and naming conventions instead of reinventing them.

**Review question:** Can users apply what they learned in one part of the product to another?

### 3.5 Error Prevention
- Design interactions so common errors are less likely to occur.
- Clarify input constraints, formats, and valid ranges before submission.
- Disable or constrain incompatible options and explain why when useful.
- Avoid dangerous defaults and misleading preselected choices.

**Review question:** Can the design prevent the error rather than merely explain it afterward?

### 3.6 Recognition Rather Than Recall
- Show relevant options, current state, and necessary information at the point of decision.
- Do not force users to remember identifiers, codes, or previous choices unnecessarily.
- Prefer clear labels over ambiguous icons without explanations.
- Preserve previously entered information when appropriate.

**Review question:** Must users remember something that could instead be shown in the interface?

### 3.7 Flexibility and Efficiency of Use
- Support both new users and experienced users.
- Consider shortcuts, bulk actions, and persistent preferences for frequent tasks.
- Shortcuts must not remove discoverable and accessible paths.
- Make advanced capabilities available without cluttering the primary workflow.

**Review question:** Can frequent users work faster without confusing new users?

### 3.8 Aesthetic and Minimalist Design
- Every element should support a goal, decision, or task.
- Low-priority information should not compete visually with critical elements.
- Avoid redundant content, decoration, excessive emphasis colors, and unnecessary labels.
- Minimalism does not mean removing essential information.

**Review question:** Does each element help the user, and is the visual priority correct?

### 3.9 Help Users Recognize, Diagnose, and Recover from Errors
An error message should:
1. Clearly state what happened.
2. Explain the cause or scope when known.
3. Suggest an actionable next step.
4. Avoid exposing sensitive information.
5. Avoid forcing users to interpret unexplained technical details.

**Review question:** Does the user understand the problem and how to address it?

### 3.10 Help and Documentation
- Make the interface as self-explanatory as reasonably possible.
- Provide help where and when it is needed, in the context of the task.
- Keep documentation searchable, relevant, and up to date for complex workflows.
- Do not use help content as a substitute for fixing a confusing interface.

**Review question:** Is the available help relevant, findable, and sufficient to support action?

## 4. Information Architecture and Navigation

- Organize content around users' mental models, tasks, and meaningful relationships between data.
- Categories should be recognizable, as distinct as practical, and named in the audience's language.
- Use methods such as card sorting and tree testing when appropriate.
- Make the user's current location, return path, and relationship to the parent section clear.
- Keep navigation depth and breadth balanced for the actual complexity; do not add layers without a reason.
- Avoid overlapping menus with similar or ambiguous names.
- Do not confuse search, filtering, sorting, and categorization; each should have a clear role.
- Show active filters, result counts, and a way to clear filters.
- For long lists, choose pagination or progressive loading that preserves context and works well for the task.
- Keep navigation terminology stable across the product.

**Review questions**
- Does the user have to guess where to find a capability or item?
- Are categories confusingly overlapping?
- Is the current page and location clear?
- Do search and filters produce understandable results?

## 5. Visual Hierarchy and Readability

- Give every page a clear primary purpose and visual hierarchy.
- Use headings, grouping, spacing, type size, weight, and contrast to communicate priority.
- Keep line length, line spacing, and content width comfortable for reading.
- Use a limited, meaningful type scale.
- Do not rely on color alone to convey meaning; supplement it with labels, shapes, icons, or text where needed.
- Ensure sufficient contrast between text and its background.
- Do not reuse similar icons for different actions. Pair unfamiliar icons with labels.
- Make interactive states visually distinguishable.
- In dense interfaces, tune information density to real tasks; do not remove necessary information merely to create whitespace.
- Decoration and animation should not compete with reading, decision-making, or task completion.

## 6. Interaction Design and Workflows

### 6.1 Controls
- Use controls appropriate to the action: buttons for actions, links for destinations, selectors for choices, and fields for data entry.
- Label actions with clear, specific verbs.
- Define hover, focus, pressed, selected, and disabled states.
- When a disabled control may confuse users, explain why it is unavailable.
- Provide comfortable pointer and touch targets with adequate spacing.

### 6.2 Forms
- Give every field a clear label; do not use placeholder text as a replacement for a label.
- Explain formats and constraints before entry or when they become relevant.
- Mark required fields and avoid asking for data that is not needed.
- Show validation feedback near the relevant field and at an appropriate time.
- Preserve valid user input after an error.
- For long forms, consider grouping and progress indicators.
- Define submission, loading, success, and failure states.

### 6.3 Modals, Drawers, and Progressive Disclosure
- Use modals for short, focused tasks rather than for every interaction.
- Consider a drawer for supplementary details or adjacent tools when it fits the task.
- Do not hide critical information or the primary path inside a secondary panel.
- Provide a clear close control and, when appropriate, Escape-key support.
- Manage keyboard focus when opening and closing overlays.
- Avoid unexpectedly losing user selections or context when panels open or close.

### 6.4 High-Impact Actions
- Confirmation messages should name the action and its consequence.
- Avoid vague prompts such as “Are you sure?” without explaining the impact.
- Consider Undo instead of an extra confirmation step when feasible.
- For bulk actions, state how many items and which scope will be affected.

## 7. UI States

For each relevant page and component, consider and design the following states:

- **Default:** Normal state.
- **Hover:** Pointer is over the element.
- **Focus:** Keyboard or input focus.
- **Pressed/Active:** While being activated.
- **Selected:** Item is selected.
- **Disabled:** Unavailable, with a reason when needed.
- **Loading:** Data is being fetched or an operation is processing.
- **Empty:** No data exists yet.
- **No results:** Nothing matches the current query or filters.
- **Error:** An operation or data request failed.
- **Success:** An operation completed successfully.
- **Partial:** Only part of the data or operation is available.
- **Stale:** Data is available but not current.
- **Offline/Connection lost:** Connectivity is unavailable.
- **Permission denied:** The user lacks required access.
- **Session expired:** The session has ended.
- **Validation error:** Input is invalid.
- **Read-only:** Viewing is allowed, editing is not.
- **Overflow:** Content exceeds its usual bounds.
- **Responsive/Zoom:** The page is viewed at a small viewport or enlarged.
- **Unsaved changes:** Changes have not been saved.

For every applicable state, define:
- What is shown to the user?
- What can the user do?
- What data or context is preserved?
- How can the user return to a normal state?

## 8. UX Writing and Content Design

### 8.1 Writing Principles
- Write clearly, concisely, precisely, and for the intended audience.
- Use familiar language; explain specialist terms when they are necessary.
- Every piece of text should help users understand, decide, or act.
- Keep the product's voice consistent across screens, messages, and channels.
- Avoid blaming users, inappropriate humor in sensitive contexts, ambiguity, and unsupported promises.
- Avoid placeholder or sample content that could be mistaken for real data.

### 8.2 Labels and Buttons
- Make the action or destination clear.
- Use specific verbs for calls to action, such as “Save changes,” “Create report,” or “Add to list.”
- Avoid vague phrases such as “Click here,” “Continue,” or “Done” unless the context makes the action unmistakable.
- Do not use the same label for different actions.
- Button text must match the actual outcome.

### 8.3 Error Messages
Recommended structure:
- **What happened?** A simple, direct explanation.
- **What can the user do?** A practical next step.
- **Was the data preserved?** Explain this clearly when relevant.

Example:
- Poor: “Error 400.”
- Better: “Your information wasn’t saved. Check your internet connection and try again. Your entered changes have been preserved.”
- If the cause or preservation status is unknown, do not make a definite claim.

### 8.4 Empty, Loading, and Success States
- An empty state should explain why nothing is shown and what to do next.
- A no-results state should offer a way to adjust the query or clear filters.
- During waiting, report the state honestly; do not promise a completion time without evidence.
- A success message should identify the result.
- Keep messages concise and close to the relevant context.

### 8.5 Localization and Right-to-Left Languages
- Set the appropriate RTL direction for right-to-left languages and verify visual order, reading order, and keyboard order.
- Use a readable font that supports the target language.
- Standardize number, date, unit, and time formats according to product needs.
- Check mixed-script strings, including email addresses, URLs, code, and identifiers, for bidirectional rendering issues.
- Align directional icons, such as back and forward, with language direction and actual behavior.
- Keep UI strings manageable and localizable rather than scattering hard-coded text throughout code.
- Localization is more than literal translation: adapt terminology and examples to the target audience.

## 9. Accessibility and Inclusive Design

**Recommended baseline:** Unless a stricter legal or organizational requirement applies, target **WCAG 2.2 Level AA**. This target must be evaluated; visual review alone cannot confirm conformance.

### 9.1 Contrast and Color
- Normal text: contrast ratio of at least **4.5:1**.
- Large text: at least **3:1**; check WCAG's precise definition of large text.
- Essential UI components and visual indicators must meet their applicable contrast criteria.
- Do not use color as the only means of communicating status, errors, or categories.
- Check contrast in relevant states and supported themes. The exact requirement depends on the type of content and component.

### 9.2 Keyboard and Focus
- All core functionality must be usable with a keyboard.
- Focus order should be logical and predictable.
- Focus indicators must be visible and not obscured by other elements.
- Users must not become trapped in a modal or component.
- Keyboard shortcuts must not unexpectedly conflict with text input or assistive technology.

### 9.3 Semantics and Assistive Technology
- Use semantic elements and accessible names for controls.
- Headings should follow a logical structure.
- Fields, errors, and instructions should be programmatically associated.
- Meaningful images need appropriate alternative text; decorative images should be hidden from assistive technology when appropriate.
- Tables must correctly identify headers and cell relationships.
- Consider appropriate, non-disruptive announcements for dynamic status updates.
- Do not use ARIA as a substitute for correct semantic HTML.

### 9.4 Target Size, Motion, and Readability
- Evaluate pointer and touch targets against WCAG and platform guidance; prefer comfortable target sizes and adequate spacing.
- Avoid unnecessary motion and respect operating-system reduced-motion preferences.
- Check content at text enlargement and narrow viewport widths without loss of content or functionality.
- Do not communicate meaning only through sound, color, shape, or movement.
- Avoid requiring users to rely solely on memory or a single sensory channel.

### 9.5 Evaluation Methods
Use a combination of:
- Automated checks to identify a subset of issues.
- Manual keyboard testing.
- Contrast and zoom checks.
- Screen-reader testing on target platforms.
- Testing with users with accessibility needs when possible.

Automated tools alone cannot prove WCAG conformance.

## 10. Responsive and Multi-Device Design

- Design for available space and content needs, not only device labels.
- Choose breakpoints where the layout or content stops working well.
- Preserve content priorities and primary actions on small screens.
- Avoid unnecessary page-level horizontal scrolling; for inherently tabular data, choose an appropriate accessible solution.
- Test navigation, filters, forms, charts, tables, and panels at supported sizes.
- Do not make hover the only way to access an interaction.
- Test text resizing, zoom, and RTL layout.
- Do not remove important content on mobile unless the product decision is deliberate and documented.

## 11. Trust, Privacy, and Security

- Request only data needed for a defined purpose.
- Explain why sensitive data is requested and how it will be used.
- Make permissions and sharing consequences understandable.
- Avoid deceptive patterns, such as making cancellation difficult, presenting misleading choices, or applying unfair pressure.
- Explain the consequences of high-impact actions before confirmation.
- Do not expose confidential information in error messages, visible logs, or public UI.
- Show data source and status where relevant.
- Explain AI capabilities and limitations transparently; do not present model output as unquestionable fact.
- Where uncertainty matters, communicate confidence and provide access to supporting sources when possible.

## 12. Data-Intensive Products, Dashboards, and Enterprise Tools

### 12.1 Data Quality and Context
- Where relevant, show metric name, unit, time range, geography, source, and last-updated time.
- Distinguish missing data, zero values, unavailable data, and stale data.
- Avoid implying more precision than the underlying data supports.
- Make source definitions and limitations available at the point of need.
- Label estimates, forecasts, and AI-generated content appropriately.

### 12.2 Tables
- Order columns according to task importance.
- Make column headings, units, and value meanings clear.
- Make sorting, filtering, row selection, and bulk actions discoverable.
- Do not unexpectedly discard state when rows or pages change.
- For large tables, evaluate density, pagination, sticky headers, and narrow-screen behavior.
- Do not rely on color alone to communicate status.

### 12.3 Charts
- Choose charts to answer the data question, not merely for visual appeal.
- Specify titles, units, time ranges, and scales.
- Avoid misleading axes and unfair comparisons.
- Use colors and visual markers consistently.
- Provide text descriptions or a complementary table for important information.
- Evaluate keyboard and assistive-technology interaction.

### 12.4 Alerts and Priorities
- Define severity levels clearly and consistently.
- Distinguish high-priority alerts from informational messages.
- Where available, show an alert's cause, time, source, and recommended action.
- Avoid excessive alerts without meaningful prioritization.
- Clearly label unconfirmed or algorithmically generated alerts.

## 13. Research, Testing, and Evaluation

Choose a method based on the question; no single method is suitable for every problem.

- **User interviews:** Understand context, motivations, language, and problems; interviews alone do not prove actual behavior.
- **Field observation:** Understand real work and environmental constraints.
- **Usability testing:** Observe whether users can complete tasks and where they struggle.
- **Behavioral analytics:** Identify usage patterns; quantitative data alone does not establish why a behavior occurs.
- **Card sorting:** Explore content grouping and users' mental models.
- **Tree testing:** Evaluate whether users can find content in a navigation structure.
- **Heuristic evaluation:** Identify potential usability problems using established principles.
- **Accessibility audit:** Evaluate relevant requirements and interaction barriers.
- **A/B testing:** Compare alternatives under suitable conditions with predefined measures; it does not automatically establish a definitive cause.

### Usability Testing Basics
1. Define the goal and primary question before testing.
2. Recruit participants who reflect the intended audience.
3. Write realistic tasks without leading participants to the answer.
4. Record behavior, hesitation, errors, time, and outcomes.
5. Separate observations from interpretations.
6. Prioritize findings by evidence, severity, and recurrence.
7. Re-evaluate the problem after making changes.

### Issue Report Template
Record the following for each finding:
- ID and title
- Page, path, or component
- Evidence and reproduction steps
- Related principle or criterion
- Affected user and task
- Impact
- Severity
- Recommended fix
- Acceptance criteria
- Status and owner

### Severity Levels
- **Critical:** Blocks a core task, creates serious risk, causes data loss, or represents a serious accessibility/security failure.
- **High:** A major or frequent barrier that substantially reduces task success or trust.
- **Medium:** Meaningful friction with a viable workaround.
- **Low:** A limited improvement to clarity, consistency, or visual polish.

Assess severity in context based on actual impact; do not prioritize solely by the number of reported issues.

## 14. Design Acceptance Checklist

### Problem and Workflow
- [ ] The user's goal and desired outcome are clear.
- [ ] The primary path can be completed without unnecessary steps.
- [ ] Errors and alternative paths have been considered.
- [ ] Important decisions are based on evidence or explicitly stated hypotheses.

### Information Architecture
- [ ] Labels are clear and consistent.
- [ ] Users can understand their current location and how to return.
- [ ] Search, filtering, and sorting have distinct, predictable behavior.
- [ ] Categories are recognizable and have minimal confusing overlap.

### UI and Design System
- [ ] Approved tokens and components are used.
- [ ] Visual hierarchy reflects task priority.
- [ ] Typography, color, spacing, and icons are consistent.
- [ ] Interactive and focus states are designed.
- [ ] The page has been reviewed at supported viewport sizes.

### Content and UX Writing
- [ ] Headings, labels, and calls to action are clear.
- [ ] Error messages are actionable.
- [ ] Empty, loading, success, and no-results states are defined.
- [ ] Language, tone, dates, and units fit the audience.
- [ ] Mixed-language content has been checked in RTL interfaces where relevant.

### Accessibility
- [ ] Contrast has been checked.
- [ ] Keyboard navigation and focus order are logical.
- [ ] Controls have accessible names and labels.
- [ ] Color is not the sole carrier of meaning.
- [ ] Zoom, small screens, and assistive technology have been considered.

### Data, Trust, and Quality
- [ ] Data source, unit, timestamp, and limitations are shown when relevant.
- [ ] Errors, stale data, and missing data have defined behavior.
- [ ] Sensitive actions and their consequences are clear.
- [ ] AI and analytical claims reflect actual confidence and evidence.
- [ ] Acceptance criteria and final validation methods are defined.

## 15. Review Instructions for Claude Code and AI Tools

When reviewing a product or change:

1. **Inspect first:** Review the project structure, technology, design system, tokens, components, relevant routes, and documentation.
2. **Preserve the existing state:** Record current behavior and constraints before proposing changes. Do not implement changes unless requested.
3. **Understand the task:** Identify user roles, goals, primary paths, data, and failure states.
4. **Evaluate:** Review usability, information architecture, interaction, content, accessibility, responsiveness, trust, and data quality.
5. **Ground findings:** Link each finding to visible evidence, a file, code, requirement, or specific principle. Do not claim something was verified if it was not checked.
6. **Prioritize:** Distinguish severity, impact, scope, and implementation cost.
7. **Recommend:** Provide actionable solutions and acceptance criteria. Explain trade-offs when multiple options exist.
8. **Maintain consistency:** Reuse existing tokens, components, and patterns. Add new patterns only with a reason.
9. **Test:** If changes are made, report the relevant tests and their actual results.
10. **Report:** Separate confirmed findings, hypotheses, limitations, completed work, and next steps.

### Suggested AI Report Format
- **Overall assessment**
- **Critical and high-severity findings**
- **Issue table:** Severity | Location | Evidence | Impact | Recommendation | Acceptance criteria
- **Accessibility findings**
- **Responsive and UI-state findings**
- **Hypotheses and open questions**
- **Changes made** (only if they were actually made)
- **Tests run and results**
- **Next steps**

## 16. Limitations and Governance

- This is a general guide and should be supplemented with product-specific requirements.
- Following the appearance of these principles does not, by itself, prove usability, satisfaction, or WCAG conformance.
- Important decisions should be validated with research, testing, data, and actual requirements.
- A designated document owner should collect team feedback and manage versions.
- Review the document at least annually and whenever important standards change.
- Record significant exceptions with their rationale, scope, risk, and review date.

## 17. Recommended Reference Sources

### Nielsen Norman Group (NN/g)
- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Usability 101: Introduction to Usability](https://www.nngroup.com/articles/usability-101-introduction-to-usability/)
- [UX Basics Study Guide](https://www.nngroup.com/articles/ux-basics-study-guide/)
- [Information Architecture Study Guide](https://www.nngroup.com/articles/ia-study-guide/)
- [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/)
- [Recognition and Recall in UX](https://www.nngroup.com/articles/recognition-and-recall/)
- [Error-Message Guidelines](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [User Interviews](https://www.nngroup.com/articles/user-interviews/)
- [Qualitative Usability Testing Study Guide](https://www.nngroup.com/articles/qual-usability-testing-study-guide/)
- [The 3 Cs of Microcopy](https://www.nngroup.com/articles/3-cs-microcopy/)
- [Navigation and IA Testing](https://www.nngroup.com/articles/navigation-ia-tests/)

### W3C / Web Accessibility Initiative
- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Keyboard Interface Practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### GOV.UK Service Manual / Design System
- [Writing for User Interfaces](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)
- [Make the Service Simple to Use](https://www.gov.uk/service-manual/service-standard/point-4-make-the-service-simple-to-use)
- [Error Message Component](https://design-system.service.gov.uk/components/error-message/)
- [Error Summary Component](https://design-system.service.gov.uk/components/error-summary/)
- [Plain Language](https://service-manual.ons.gov.uk/content/writing-for-users/plain-language)

### Platform Design Guidance
- [Microsoft Fluent Design Principles](https://fluent2.microsoft.design/design-principles)
- [Microsoft Fluent Accessibility](https://fluent2.microsoft.design/accessibility)
- [Microsoft Fluent Content Design](https://fluent2.microsoft.design/content-design)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Accessibility Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)

---

## Implementation Note

Save this document as `Design-Standards/docs/ux-principles.md` and reference it from `CLAUDE.md` as the shared UX source of truth. Before treating it as a final organizational standard, assign an owner and document any product-specific requirements.

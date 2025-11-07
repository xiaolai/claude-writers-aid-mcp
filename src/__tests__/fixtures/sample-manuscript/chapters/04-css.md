# CSS Fundamentals

CSS (Cascading Style Sheets) controls the visual presentation of HTML elements. It's essential for creating attractive, responsive web applications.

## CSS Syntax

### Selectors and Rules

CSS consists of selectors and declaration blocks:

```css
selector {
    property: value;
    another-property: value;
}
```

Common selectors include:

1. Element selectors (`h1`, `p`)
2. Class selectors (`.class-name`)
3. ID selectors (`#id-name`)
4. Attribute selectors (`[type="text"]`)

## Box Model

Every element is a rectangular box with content, padding, border, and margin.

```css
.box {
    width: 300px;
    padding: 20px;
    border: 1px solid #ccc;
    margin: 10px;
}
```

### Layout Techniques

<!-- TODO: Expand this section with grid examples -->

#### Flexbox

Flexbox is excellent for one-dimensional layouts:

```css
.container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

#### Grid

CSS Grid handles two-dimensional layouts:

```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}
```

## Responsive Design

### Media Queries

Media queries adapt styles to different screen sizes:

```css
@media (max-width: 768px) {
    .container {
        flex-direction: column;
    }
}
```

### Mobile-First Approach

Start with mobile styles, then add complexity for larger screens. This approach improves performance on mobile devices and ensures better user experience across all screen sizes and device types.

<!-- Long sentence intentional -->

## Colors and Typography

### Color Systems

Use consistent color schemes:

* Hex colors: `#FF5733`
- RGB: `rgb(255, 87, 51)`
* HSL: `hsl(9, 100%, 60%)`
- CSS variables for themes

<!-- Mixed list markers -->

### Typography

```css
:root {
    --font-primary: 'Roboto', sans-serif;
    --font-size-base: 16px;
}

body {
    font-family: var(--font-primary);
    font-size: var(--font-size-base);
    line-height: 1.6;
}
```

## Modern CSS Features

### CSS Variables

CSS custom properties (variables) make maintenance easier:

```css
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
}

.button {
    background-color: var(--primary-color);
}
```

### CSS Grid

<!-- This is a duplicate heading from earlier -->

CSS Grid is powerful for complex layouts. It provides precise control over rows and columns.

## Performance

### Optimization Tips

Optimize CSS for better performance:

1. Minimize CSS files
2. Use shorthand properties
3. Avoid expensive selectors
4. Leverage browser caching
5. Use CSS sprites for icons

<!-- FIXME: Add code example for CSS sprites -->

### Critical CSS

Inline critical CSS in the `<head>` for faster initial render. Load non-critical CSS asynchronously.

## Preprocessors

### SASS/SCSS

SASS extends CSS with features like variables, nesting, and mixins:

```scss
$primary-color: #007bff;

.button {
    background-color: $primary-color;

    &:hover {
        background-color: darken($primary-color, 10%);
    }
}
```

<!-- TODO: Add section on Less and PostCSS -->

## Frameworks

### Popular CSS Frameworks

Consider using frameworks for rapid development:

* Bootstrap
- Tailwind CSS
* Bulma
- Foundation
* Material-UI

Each framework has its strengths. Bootstrap provides comprehensive components. Tailwind offers utility-first styling. Choose based on project requirements.

## Animation

### Transitions

Smooth property changes:

```css
.button {
    transition: background-color 0.3s ease;
}

.button:hover {
    background-color: #0056b3;
}
```

### Keyframe Animations

Create complex animations:

```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.element {
    animation: fadeIn 1s ease-in;
}
```

## Browser Compatibility

### Vendor Prefixes

Some properties need vendor prefixes:

```css
.element {
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    transform: rotate(45deg);
}
```

Use autoprefixer to handle this automatically.

## Debugging

### Developer Tools

Use browser DevTools to inspect and debug CSS. Chrome, Firefox, and Safari all have excellent CSS debugging tools. You can inspect elements, modify styles in real-time, and see computed values.

<!-- Long sentence for testing -->

### Common Issues

* Specificity conflicts
- Cascade problems
* Float clearing issues
- Z-index stacking contexts
* Box model miscalculations

## Resources

For more CSS information:

- [MDN CSS Documentation](https://developer.mozilla.org/docs/Web/CSS)
* [CSS Tricks](https://css-tricks.com/)
- [Can I Use](https://caniuse.com/)
* [CSS Grid Garden](https://cssgridgarden.com/)
- [Flexbox Froggy](https://flexboxfroggy.com/)

See also our [design guidelines](../appendix/design.md) and [style guide](missing-link.md).

<!-- One broken link intentional -->

---

**Previous:** [HTML Basics](03-html-basics.md) | **Next:** [JavaScript Essentials](05-javascript.md)

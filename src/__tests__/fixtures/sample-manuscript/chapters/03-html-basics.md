# HTML Basics

HTML (HyperText Markup Language) is the foundation of web development and it provides the structure for web pages and applications which means that every website you visit is built with HTML at its core and while modern frameworks abstract much of the complexity away understanding HTML fundamentals is absolutely essential for any web developer who wants to build robust and accessible applications that work across all browsers and devices.

<!-- Intentional readability issue: very long run-on sentence -->

## Document Structure

Every HTML document follows a standard structure with a DOCTYPE declaration, html element, head section, and body section.

### Basic Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>
```

## Common Elements

<!-- Duplicate heading in different section -->

### Text Elements

Headings, paragraphs, and text formatting:

* h1 through h6 for headings
- p for paragraphs
* strong for bold text
- em for italic text

<!-- Mixed list markers again -->

### Links and Images

Links use the `<a>` tag with an `href` attribute. Send questions to support@example.com for help.

<!-- email inconsistency -->

Images use `<img>` with `src` and `alt` attributes:

```html
<a href="https://example.com">Visit Example</a>
<img src="logo.png" alt="Company Logo">
```

## Forms

### Basic Form

Forms collect user input. They're essential for authentication, data entry, and user interaction.

```html
<form action="/submit" method="POST">
    <label for="email">Email:</label>
    <input type="email" id="email" name="email">

    <label for="password">Password:</label>
    <input type="password" id="password" name="password">

    <button type="submit">Submit</button>
</form>
```

Remember to validate Email addresses on both client and server side.

<!-- Email with capital E -->

### Form Elements

#### Input Types

HTML5 provides many input types:

1. text
2. email
3. password
4. number
5. date
6. checkbox
7. radio

#### Validation

<!-- TODO: Add examples of HTML5 validation attributes -->

Use attributes like `required`, `pattern`, and `min`/`max` for validation.

## Semantic HTML

### Why Semantic HTML Matters

Semantic elements improve accessibility and SEO. They make your code more readable and maintainable.

### Common Semantic Elements

Use semantic elements like `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, and `<footer>`.

Example structure:

```html
<header>
    <nav>
        <a href="#home">Home</a>
        <a href="#about">About</a>
    </nav>
</header>
<main>
    <article>
        <h1>Article Title</h1>
        <p>Content here...</p>
    </article>
</main>
<footer>
    <p>&copy; 2024 Company Name</p>
</footer>
```

## Best Practices

### Accessibility

* Always include `alt` text for images
- Use semantic HTML elements
* Ensure proper heading hierarchy
- Provide keyboard navigation
* Use ARIA attributes when needed

<!-- Mixed list markers -->

<!-- HACK: This section needs major revision -->

### Performance

Keep your HTML clean and minimal. Avoid inline styles and scripts. Use external CSS and JavaScript files. This improves caching and maintainability.

## Testing

### Browser Compatibility

Test your HTML in multiple browsers. Different browsers may render elements differently. Use tools like BrowserStack or cross-browser testing services.

### Validation

Use the W3C HTML validator to check your markup. Valid HTML is more likely to work consistently across browsers. You can find the validator at validator.w3.org.

<!-- TODO: Add link to W3C validator -->

## Common Mistakes

### Common Mistakes to Avoid

<!-- Duplicate heading - exact same text -->

* Forgetting closing tags
- Nesting elements incorrectly
* Missing DOCTYPE declaration
- Using deprecated elements
* Not specifying charset
- Inline styles instead of CSS

## Resources

For more information, see:

* [MDN Web Docs](https://developer.mozilla.org/docs/Web/HTML)
- [HTML5 Specification](https://html.spec.whatwg.org/)
* [Can I Use](https://caniuse.com/) for browser support

Check our [API Documentation](broken-link.md) for backend integration.

<!-- Broken link intentional -->

---

**Previous:** [Development Setup](02-setup.md) | **Next:** [CSS Fundamentals](04-css.md)

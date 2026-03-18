import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { CHTML } from 'mathjax-full/js/output/chtml.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
	packages: AllPackages
});

const chtml = new CHTML({
	fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'
});

const html = mathjax.document('', {
	InputJax: tex,
	OutputJax: chtml
});

function escapeHtml(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderInlineMath(math: string) {
	const node = html.convert(math, { display: false });
	return adaptor.outerHTML(node);
}

function renderDisplayMath(math: string) {
	const node = html.convert(math, { display: true });
	return adaptor.outerHTML(node);
}

export function renderLatexText(input: string | undefined | null): string {
	if (!input) return '';

	let output = escapeHtml(input);

	output = output.replace(/\\\[((?:.|\n|\r)*?)\\\]/g, (_, expr: string) => {
		return renderDisplayMath(expr.trim());
	});

	output = output.replace(/\$\$((?:.|\n|\r)*?)\$\$/g, (_, expr: string) => {
		return renderDisplayMath(expr.trim());
	});

	output = output.replace(/\\\(((?:.|\n|\r)*?)\\\)/g, (_, expr: string) => {
		return renderInlineMath(expr.trim());
	});

	output = output.replace(/\$([^$\n]+?)\$/g, (_, expr: string) => {
		return renderInlineMath(expr.trim());
	});

	return output.replace(/\n/g, '<br />');
}
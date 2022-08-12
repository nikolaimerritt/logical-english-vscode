import { Template } from './template';
import { Atom, Formula, FormulaElement } from './formula';
import { ElementKind, Surrounding } from './element';
import { sanitiseLiteral } from './utils';
import { dummyType } from './type-tree';


export function parseFormula(templates: Template[], formula: string): Formula {
	const formulaEls = parseFormulaElements(templates, formula);
	return new Formula(dummyType, formulaEls);
}


export function parseFormulaFromTemplate(template: Template, formula: string): Formula {
	const elements = parseFormulaElementsFromTemplate(template, formula);
	return new Formula(dummyType, elements);
}



function parseFormulaElements(templates: Template[], formula: string): FormulaElement[] {
	const template = Template.findBestMatch(templates, formula);
	if (template === undefined)
		return [];
	
	const elements = parseFormulaElementsFromTemplate(template, formula);
	if (elements.length >= 2) {
		const lastSurrounding = elements.at(-2);
		const lastTerm = elements.at(-1);

		if (lastSurrounding?.elementKind === ElementKind.Surrounding
				&& lastTerm?.elementKind === ElementKind.Term
				&& lastSurrounding.name.endsWith(' that')
		) {
			const subFormulaEls = parseFormulaElements(templates, lastTerm.name);
			elements[elements.length - 1] = new Formula(lastTerm.type, subFormulaEls);
		}
	}

	return elements;
}



function parseFormulaElementsFromTemplate(template: Template, formula: string): FormulaElement[] {
	formula = sanitiseLiteral(formula);
		const elements: FormulaElement[] = [];
		let lastTypeIdx = template.elements[0].elementKind === ElementKind.Type
			? 0
			: -1;
		
		for (let i = 0; i < template.elements.length; i++) {
			const join = template.elements[i];
			if (join.elementKind === ElementKind.Surrounding) {
				let phraseIdx = formula.indexOf(join.name);
				let phrase = join.name;
				if (phraseIdx === -1) {
					const startOfPhraseIdx = [...Array(formula.length).keys()]
					.find(i => join.name.startsWith(formula.slice(i, )));
					if (startOfPhraseIdx !== undefined) {
						phraseIdx = startOfPhraseIdx;
						phrase = formula.slice(phraseIdx, );
					}
				}

				if (phraseIdx === -1)
					break;
				
				lastTypeIdx = i + 1;

				if (i > 0 && phraseIdx > 0) {
					const type = template.elements[i - 1];
					if (type.elementKind === ElementKind.Type) {
						const termName = sanitiseLiteral(formula.slice(0, phraseIdx));
						elements.push(new Atom(termName, type));
					}
				}

				elements.push(new Surrounding(phrase));
				formula = sanitiseLiteral(formula.slice(phraseIdx + phrase.length + 1, ));
			}
		}

		if (formula.length > 0 && lastTypeIdx >= 0 && lastTypeIdx < template.elements.length) {
			const type = template.elements[lastTypeIdx];
			if (type.elementKind === ElementKind.Type) {
				// if (
				// 	lastTypeIdx - 1 >= 0
				// 	&& template.elements[lastTypeIdx - 1].elementKind === ElementKind.Surrounding
				// 	&& template.elements[lastTypeIdx - 1].name.endsWith(' that')
				// ) {
				// 	const formulaElements = this.extractFormulaElements(formula);
				// 	elements.push(new Formula(type, formulaElements));
				// }
				// else 
					elements.push(new Atom(sanitiseLiteral(formula), type));
			}
		}
		return elements;
}
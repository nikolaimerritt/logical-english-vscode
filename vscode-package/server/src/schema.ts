import { Template } from './template';
import { Atom, Formula, FormulaElement, TemplatelessFormula } from './formula';
import { ElementKind, Surrounding } from './element';
import { maximal } from './utils';
import { dummyType } from './type-tree';
import { subformulaPattern, templatesInDocument } from './parsing';

export function isTemplateless(value: Formula | TemplatelessFormula): value is TemplatelessFormula {
	return (value as Formula).elements === undefined;
}


export class Schema {
	private readonly templates: Template[];

	constructor(templates: Template[]) {
		this.templates = templates;
	}

	public static fromDocument(document: string) {
		return new Schema(templatesInDocument(document));
	}

	public parseFormula(formula: string, formulaType = dummyType): Formula | TemplatelessFormula {
		// const formulaEls = this.parseElements(formula);
		// if (formulaEls.length === 0)
		// 	return new TemplatelessFormula(formula, formulaType);
		
		// return new Formula(formulaType, formulaEls);

		const template = this.findBestMatch(formula);
		if (template === undefined)
			return new TemplatelessFormula(formula, formulaType);
		
		const elements = template.parseFormula(formula).elements;
		if (elements.length >= 2) {
			const lastSurrounding = elements.at(-2);
			const lastTerm = elements.at(-1);
	
			if (lastSurrounding?.elementKind === ElementKind.Surrounding
					&& lastTerm?.elementKind === ElementKind.Term
					&& lastSurrounding.name.endsWith(' that')
			) {
				elements[elements.length - 1] = this.parseFormula(lastTerm.name, lastTerm.type);
			}
		}
	
		return new Formula(formulaType, elements);
	}

	// finds the template that 
	// 	- matches the literal
	// 	- then, has the most amount of variables
	//  - then, has the longest surroundings

	// returns undefined if there is no matching Template
	public findBestMatch(formula: string): Template | undefined {
		if (subformulaPattern.test(formula))
			formula = formula.replace(subformulaPattern, '_');
		
		const candidates = this.templates.filter(t => t.matchesFormula(formula));

		if (candidates.length === 0)
			return undefined;

		const maxVariableCount = Math.max(...candidates.map(t => t.types.length));
		const candidatesWithMaxVars = candidates.filter(t => t.types.length === maxVariableCount);
		return maximal(candidatesWithMaxVars, t => t.surroundings.join(' ').length);
	}
}
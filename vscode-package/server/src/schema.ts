import { Template } from './template';
import { Constant, AtomicFormula, FormulaElement, TemplatelessFormula, TermKind, Variable, Term } from './formula';
import { ElementKind, Surrounding } from './element';
import { maximal } from './utils';
import { dummyType, TypeTree } from './type-tree';
import { subformulaPattern, templatesInDocument, typeTreeInDocument } from './parsing';

export function isTemplateless(value: AtomicFormula | TemplatelessFormula): value is TemplatelessFormula {
	return (value as AtomicFormula).elements === undefined;
}


export class Schema {
	private readonly templates: Template[];
	private readonly typeTree: TypeTree;

	constructor(typeTree: TypeTree, templates: Template[]) {
		this.typeTree = typeTree;
		this.templates = templates;
	}

	public static fromDocument(document: string) {
		return new Schema(
			typeTreeInDocument(document),
			templatesInDocument(document)
		);
	}

	public parseFormula(formula: string, formulaType = this.typeTree.getPredicateTopType()): AtomicFormula | TemplatelessFormula {
		// const formulaEls = this.parseElements(formula);
		// if (formulaEls.length === 0)
		// 	return new TemplatelessFormula(formula, formulaType);
		
		// return new Formula(formulaType, formulaEls);

		const template = this.findBestMatch(formula);
		if (template === undefined)
			return new TemplatelessFormula(formula, formulaType);
		
		const elements = template.parseFormula(this.typeTree, formula).elements;
		if (elements.length >= 2) {
			const lastSurrounding = elements.at(-2);
			const lastTerm = elements.at(-1);
	
			if (lastSurrounding?.elementKind === ElementKind.Surrounding
					&& lastTerm?.elementKind === ElementKind.Term
					&& lastSurrounding.name.endsWith(' that')
					&& this.shouldBeFormula(lastTerm)
			) {
				elements[elements.length - 1] = this.parseFormula(lastTerm.name, lastTerm.type);
			}
		}
	
		return new AtomicFormula(formula, formulaType, elements);
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

		// const maxVariableCount = Math.max(...candidates.map(t => t.types.length));
		// const candidatesWithMaxVars = candidates.filter(t => t.types.length === maxVariableCount);
		// return maximal(candidatesWithMaxVars, t => t.matchScore(formula));
		return maximal(candidates, t => t.matchScore(formula));
	}

	private shouldBeFormula(term: Term) {
		if (term.termKind === TermKind.Constant)
			return true;

		if (term.termKind === TermKind.Variable)
			return this.templates.some(t => t.matchesFormula(term.name));

		return false;
	}
}
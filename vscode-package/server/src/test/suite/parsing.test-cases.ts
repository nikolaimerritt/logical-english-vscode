import { AtomicFormula, TemplatelessFormula, Term } from '../../formula';
import { ContentRange } from '../../parsing';
import { Template } from '../../template';

export interface DocTestCase {
	document: string,
	typeHierarchy: ContentRange<string[]>,
	templates: ContentRange<Template[]>,
	knowledgeBase: ContentRange<string[]>,
	scenarios: ContentRange<string[]>[],
	queries: ContentRange<string[]>[],
	formulas: ContentRange<AtomicFormula | TemplatelessFormula>[],
	termsInClause: Map<string, ContentRange<Term>[]>
}

export const testCases: DocTestCase[] = [];
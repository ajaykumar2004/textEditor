export class SuffixTreeNode {
    children: { [key: string]: SuffixTreeNode } = {};
    start: number;
    end: number | null = null;
  
    constructor(start: number) {
      this.start = start;
    }
  }
  
  export class SuffixTree {
    root: SuffixTreeNode = new SuffixTreeNode(-1);
    text: string = "";
  
    insert(text: string) {
      this.text = text;
      for (let i = 0; i < text.length; i++) {
        this.insertSuffix(i);
      }
    }
  
    insertSuffix(startIndex: number) {
      let currentNode = this.root;
      const suffix = this.text.slice(startIndex);
  
      for (const char of suffix) {
        if (!currentNode.children[char]) {
          currentNode.children[char] = new SuffixTreeNode(startIndex);
        }
        currentNode = currentNode.children[char];
      }
    }
  
    search(query: string): string[] {
      let currentNode = this.root;
      for (const char of query) {
        if (!currentNode.children[char]) {
          return []; // No match
        }
        currentNode = currentNode.children[char];
      }
      return this.collectMatches(currentNode);
    }
  
    collectMatches(node: SuffixTreeNode): string[] {
      const result: string[] = [];
      this.collectAllSuffixes(node, result);
      return result;
    }
  
    collectAllSuffixes(node: SuffixTreeNode, result: string[]) {
      if (node.start !== -1) {
        result.push(this.text.substring(node.start));
      }
      for (const child in node.children) {
        this.collectAllSuffixes(node.children[child], result);
      }
    }
  }
  
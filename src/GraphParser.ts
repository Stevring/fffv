class FilterPadParams {
  label: string
  constructor(l: string) {
      this.label = l
  }
}

class FilterParams {
  filterName: string = ""
  instanceName: string = ""
  inputPads: FilterPadParams[] = []
  outputPads: FilterPadParams[] = []
  opts: string = ""
}

class FilterChain {
  filterParams: FilterParams[] = []
}

class FilterSegment {
  chains: FilterChain[] = [];
  scaleSwOpts: string = ""; // sw scale options
}
// [in_0]scale
class FilterGraphStringParser {
  p: number; // next parsing position
  str: String; // graph description
  constructor(str: string) {
      this.p = 0;
      this.str = str.trim()
      console.log("init parser with ", this.str)
  }

  // Parser
  parseSwsOpts(): string {
      if (!this.str.startsWith("sws_flags=", this.p)) {
          return ""
      }
      this.p += "sws_flags=".length;
      const colonP = this.str.indexOf(";", this.p)
      if (colonP == -1) {
          throw Error(`Failed to parse sws_flags ${this.str.substring(this.p, colonP)}`)
      }
      const res = this.str.substring(this.p, colonP)
      this.p = colonP + 1;
      this.skipWhiteSpaces();
      return res;
  }

  parseSegment(): FilterSegment {
    const graphSegment = new FilterSegment()
    graphSegment.scaleSwOpts = this.parseSwsOpts()
    this.skipWhiteSpaces()
    while (!this.finished()) {
      graphSegment.chains.push(this.parseChain())
      this.skipWhiteSpaces()
    }
    return graphSegment
  }

  parseChain(): FilterChain {
      const chain = new FilterChain()
      while (!this.finished()) {
        const filter = this.parseFilter()
        chain.filterParams.push(filter)
        if (!this.finished()) {
          const c = this.str.charAt(this.p)
          if (c !== "," && c !== ";") {
            throw Error(`Traling unparsed string after a filter: ${this.str.substring(this.p)}`)
          } else {
            this.p++;
            this.skipWhiteSpaces()
            if (c === ";") break;
          }
        }
      }
      return chain
  }

  parseFilter(): FilterParams {
      const f = new FilterParams()
      // input label
      f.inputPads.push(...this.parseLinkLabels())
      // filter name
      let filterNameEndP = this.nextOccurrence([",", ";", "=", "["], this.p)
      if (filterNameEndP == -1) {
        filterNameEndP = this.str.length;
      }
      let filterName = this.str.substring(this.p, filterNameEndP);
      let instanceName = "";
      const atP = filterName.indexOf("@");
      if (atP != -1) {
        instanceName = filterName.substring(atP + 1);
        filterName = filterName.substring(0, atP);
      }
      f.filterName = filterName;
      f.instanceName = instanceName; 
      this.p = filterNameEndP;
      console.log(`filter name ${filterName}`);
      if (filterName.length == 0) {
        throw Error(`Filter name not provided`)
      }
      // filter options
      if (this.str.charAt(this.p) === "=") {
        ++this.p;
        let optEndP = this.nextOccurrence(["[", "]", ",", ";"], this.p)
        if (optEndP == -1) optEndP = this.str.length
        const opts = this.str.substring(this.p, optEndP)
        console.log(`option ${opts} [${this.p}, ${optEndP}]`)
        this.p = optEndP
        f.opts = opts
        this.skipWhiteSpaces()
      }
      f.outputPads.push(...this.parseLinkLabels())
      this.skipWhiteSpaces()
      return f
  }

  parseLinkLabels(): FilterPadParams[] {
    const res = []
    while(!this.finished() && this.str.startsWith("[", this.p)) {
      const pad = this.parseLinkLabel() as FilterPadParams
      res.push(pad)
    }
    return res
  }

  parseLinkLabel(): FilterPadParams | null {
      if (!this.str.startsWith("[", this.p)) {
          return null;
      }
      const secondBracketP = this.str.indexOf("]", this.p)
      if (secondBracketP == -1) {
          throw Error(`Failed to Parse link label: ${this.str.substring(this.p, secondBracketP)}`)
      }
      console.log(`filter pad [${this.p + 1}, ${secondBracketP}]`)
      const pad = new FilterPadParams(this.str.substring(this.p + 1, secondBracketP));
      this.p = secondBracketP + 1;
      this.skipWhiteSpaces();
      return pad;
  }

  // Utils

  skipWhiteSpaces(): void {
      let c = this.str.charAt(this.p);
      while (c === " " || c === "\t" || c === "\n" || c === "\r") {
          c = this.str.charAt(++this.p)
      }
  }

  nextOccurrence(terms: string[], position: number): number {
    console.log(`search ${terms} from ${position}`)
    for (; position < this.str.length; position++) {
      if (terms.includes(this.str.charAt(position))) {
        console.log(`find occurrence ${this.str.charAt(position)} at ${position}`)
        return position
      }
    }
    return -1
  }

  finished(): boolean {
      return this.p >= this.str.length;
  }
}

export { FilterGraphStringParser, FilterSegment, FilterChain, FilterParams, FilterPadParams}
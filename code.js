/* Trillium next notes widget
   Show label attributes for books as a cloud v20250219.01

   To activate add attribute #showCloud to the book

   2025 by Holger Wolff under BSD 3-clause license */

class AttributeListWidget extends api.NoteContextAwareWidget {
    get parentWidget() { return "right-pane" }
    
    get position() { return 1; }
    
    constructor(name, age) {
        super();
		console.log(">constructor");
        this.$filterMap = new Map();
        this.$buttonHandlerAttached = false;
        this.$CloudSortAttributeByWeight = CloudDefaultSortAttributeByWeight;
        this.$CloudIgnoredAttributes = [];
        this.$CloudShowCount = CloudDefaultShowCount;
    }

    isEnabled() {
        var note = api.getActiveContextNote();
        console.log(">isEnabled", note);
        return super.isEnabled() 
        	&& note != null
            && note.type === 'book'
        	&& note.hasLabel(CloudActivateAttribute);
    }

    doRender() {
        console.log(">doRender");
        this.$widget = $(HTML);
        this.cssBlock(CSS);
        this.$attributeCloud = this.$widget.find('ul.cloudList');
        this.$attributeResult = this.$widget.find('ul.cloudResult');
        return this.$widget;
    }

    async refreshWithNote() {
        var note = api.getActiveContextNote();
        console.log(">refreshWithNote", note);
        this.$baseNoteTitle = note.title;
        this.$baseNoteId = note.noteId;
        this.attachButtonHandler();
        
        this.updateCloudIgnoredAttributes(note);
        this.updateShowCount(note);
		await this.updateAttributeMap(note);

		this.updateAttributeCloud();
        this.filterUpdate();
    }

    updateCloudIgnoredAttributes (note) {
        this.$CloudIgnoredAttributes.length = 0;
        this.$CloudIgnoredAttributes.push(...CloudDefaultIgnoredAttributes);
        if (note.hasLabel(CloudActivateAttribute)) {
            var toIgnored = note.getLabels(CloudIgnoredAttribute);
            toIgnored.forEach((att) => {
                this.$CloudIgnoredAttributes.push(att.value.toLowerCase());
            });
        }
        console.log("<updateCloudIgnoredAttributes", this.$CloudIgnoredAttributes);
    }
    
    updateShowCount(note) {
        if (note.hasLabel(CloudFlipShowCount)) this.$CloudShowCount = !CloudDefaultShowCount
        else this.$CloudShowCount = CloudDefaultShowCount;
    }

    updateAttributeCloud() {
        const myClass = this;

        this.$attributeCloud[0].innerHTML="";
        if (this.$CloudShowCount) this.$attributeCloud[0].setAttribute("data-show-value", '')
        else this.$attributeCloud[0].removeAttribute("data-show-value")

        var filter = [];
        if (this.$filterMap.has(this.$baseNoteId)) filter = this.$filterMap.get(this.$baseNoteId);
        
        var textFilter = $("input.cloudTitle")[0].value;

        this.$attributeMap.forEach((cnt,att) => {
            if (att.indexOf(textFilter) != -1) {
                var a = document.createElement("a");
                a.append(att);
                a.setAttribute("data-weight", cnt[1]);
                a.setAttribute("data-count", cnt[0]);
                a.href="#";

                var i = filter.indexOf("+"+att);
                if (i >= 0)	a.setAttribute("state", "add");

                i = filter.indexOf("-"+att);
                if (i >= 0)	a.setAttribute("state", "del");

                a.addEventListener("click", function(){ myClass.filterClick(this) }, false);

                var li = document.createElement("li");
                li.appendChild(a);

                this.$attributeCloud.append(li);
            }
        });
    }
    
    attachButtonHandler() {
        if (this.$buttonHandlerAttached == false) {
            const myClass = this;
            var reloadButton = $("span.cloudTitle.bx-refresh")[0];
            reloadButton.addEventListener("click", function(){ 
                myClass.$filterMap.set(myClass.$baseNoteId, []);
                myClass.refreshWithNote();
            }, false);

            var sortButton = $("span.cloudTitle.bx-sort")[0];
            sortButton.addEventListener("click", function(){
                myClass.$CloudSortAttributeByWeight = !myClass.$CloudSortAttributeByWeight;
                myClass.refreshWithNote();
            }, false);
            
            var filterText = $("input.cloudTitle")[0];
            filterText.addEventListener("input", function(){
                myClass.updateAttributeCloud();
            }, false);

            this.$buttonHandlerAttached = true;
        }
    }
    
    async updateAttributeMap(note) {
        console.log(">updateAttributeMap", note);

        var filter = [];
        if (CloudFilter && this.$filterMap.has(this.$baseNoteId)) filter = this.$filterMap.get(this.$baseNoteId);

        var addFilter = [];
        var delFilter = [];
        filter.forEach((fItem) => {
            if (fItem[0] == "+") addFilter.push(fItem.substring(1))
            else delFilter.push(fItem.substring(1))
        });

        const baseChilds = await note.getChildNotes();
        var myMap = new Map();
        var maxCount = 0;
        var addCount = 0;
        var delCount = 0;

        baseChilds.forEach(async (child) => {
            var childAttributes = child.getOwnedAttributes();
            var attributeNames = this.getLabelAttributeNames(childAttributes);
            var hasAdd = this.hasAttributes(attributeNames, addFilter);
            var hasDel = delFilter.length != 0 && this.hasAttributes(attributeNames, delFilter);
            if (hasDel) delCount++;
            if (hasAdd) addCount++;

            if ((hasAdd && !hasDel) || filter.length == 0) {
                attributeNames.forEach(async (att) => {
                    if (!this.$CloudIgnoredAttributes.includes(att)) {
                        if (!myMap.has(att))
                            myMap.set(att, 0);

                        var newCount = myMap.get(att) + 1;
                        myMap.set(att, newCount);
                        if (newCount > maxCount) maxCount = newCount;
                    }
                });
            }
        });
        
        addFilter.forEach((att) => {
            if (!myMap.has(att)) myMap.set(att, addCount);
        });

        delFilter.forEach((att) => {
            if (!myMap.has(att)) myMap.set(att, delCount);
        });
        
        var attWeight = maxCount / 8;
        myMap.forEach((v,k) => {
            var cnt = myMap.get(k);
            myMap.set(k, [cnt ,Math.round(cnt / attWeight) + 1]);
        });

        // sort by name
        myMap = new Map([...myMap.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, {sensitivity: 'base'}) ));
        // sort by weight
        if (this.$CloudSortAttributeByWeight) this.$attributeMap = new Map([...myMap.entries()].sort((a, b) => b[1][1] - a[1][1]))
        else this.$attributeMap = myMap;
    }
    
    getLabelAttributeNames(attributes) {
        var attNames = [];
        attributes.forEach((att) => {
            var name = att.name.toLowerCase();
            if (!attNames.includes(name) && att.type == "label") attNames.push(name);
        });
        
        return attNames;
    }
    
    hasAttributes(attributes, has) {
        return has.every(att2 => attributes.some(att1 => att1 === att2));
    }
    
    async filterClick(element) {
        console.log(">filterClick", element);
        var filter = [];
        if (this.$filterMap.has(this.$baseNoteId)) filter = this.$filterMap.get(this.$baseNoteId);

        var i = filter.indexOf("+"+element.innerText);
        if (i >= 0)	filter.splice(i, 1);
        
        i = filter.indexOf("-"+element.innerText);
        if (i >= 0)	filter.splice(i, 1);

        if (!element.hasAttribute("state")) {
            element.setAttribute("state", "add");
            filter.push("+"+element.innerText);
        } else if (element.getAttribute("state") == "add") {
            element.setAttribute("state", "del");
            filter.push("-"+element.innerText);
        } else {
            element.removeAttribute("state");
        }
        
        this.$filterMap.set(this.$baseNoteId, filter);

        this.refreshWithNote();
    }
    
    async filterUpdate() {
        console.log(">filterUpdate", this.$baseNoteId, api.getActiveContextNote());
        const myClass = this;

        var filter = [];
        if (this.$filterMap.has(this.$baseNoteId)) filter = this.$filterMap.get(this.$baseNoteId);

        var search = "note.ancestors.noteId = '"+this.$baseNoteId+"'";
        filter.forEach((fItem) => {
            if (fItem[0] == "+") search += " #" + fItem.substring(1)
            else search += " #!" + fItem.substring(1)
        });

        var found = await api.searchForNotes(search);
        
		this.$attributeResult[0].innerHTML="";
        found.forEach((element) => {
            if (this.$baseNoteId != element.noteId){
                var iconSpan = document.createElement("span");
                iconSpan.className = "note-icon bx bx-note";

                var a = document.createElement("a");
                a.className = "no-tooltip-preview";
                a.setAttribute("data-note-id", element.noteId);
                a.append(element.title);
                a.href="#";
                a.addEventListener("click", function(){ myClass.openNote(this) }, false);

                var titleSpan = document.createElement("span");
                titleSpan.className = "note-book-title";
                titleSpan.append(a);

                var h5 = document.createElement("h5");
                h5.className = "note-book-header";
                h5.style = "padding: 0px; border: none;";
                h5.appendChild(iconSpan);
                h5.appendChild(titleSpan);

                var baseDiv = document.createElement("div");
                baseDiv.className = "note-book-card";
                baseDiv.setAttribute("data-note-id", element.noteId);
                baseDiv.appendChild(h5);

                this.$attributeResult.append(baseDiv);
            }
        });
    }
    
    async openNote(element) {
        api.openTabWithNote(element.getAttribute("data-note-id"), true);
    }
}

const CloudActivateAttribute = "showCloud";
const CloudIgnoredAttribute = "cloudIgnore";
const CloudFlipShowCount = "cloudFlipShowCount";
const CloudFilter = true;

const CloudDefaultIgnoredAttributes = [CloudActivateAttribute.toLowerCase(), CloudIgnoredAttribute.toLowerCase(), CloudFlipShowCount.toLowerCase(), "viewtype"];
const CloudDefaultSortAttributeByWeight = false;
const CloudDefaultShowCount = true;

const HTML = `<div id="cloudBase">
    <div class="cloudTitle">
    	<span style="text-wrap-mode:nowrap;">Filter:</span>
    	<input class="cloudTitle" type="text"></input>
    	<span class="bx bx-refresh cloudTitle" style="right: 20px;"></span>
        <span class="bx bx-sort cloudTitle" style="right: 50px;"></span>
    </div>
    <div class="cloudList"><ul class="cloudList" role="navigation"></ul></div>
	<div class="cloudResult"><ul class="cloudResult"></ul></div>
</div>`;

const CSS = `
#cloudBase {
  padding: 10px;
  border-top: 1px solid var(--main-border-color);
  height: 100%;
  background-color: var(--input-background-color);
  display: flex;
  flex-direction: column;
}

.cloudTitle {
  height: 30px;
  padding: 10px 0;
  font-size: large;
  display: flex;
  align-items: center;
  width: 100%;
}

.cloudTitle input.cloudTitle {
  flex-grow: 1;
  border: 1px solid #ccc;
  margin: 10px;
}

.cloudTitle span.cloudTitle {
  width: 20px;
  height: 30px;
  background-color: transparent;
  color: var(--main-text-color);
  cursor: pointer;
  margin-left: 5px;
}

div.cloudList {
  overflow: auto;
  padding-left: 0px;

  flex: 1;
  width: 100%
  min-height: 0px;
  min-width: 0px;
}

ul.cloudList {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  line-height: 2.5rem;
}

div.cloudResult {
  overflow: auto;
  padding-left: 0px;

  flex: 1;
  width: 100%;
  min-height: 0px;
  min-width: 0px;
}

ul.cloudResult {
  padding-left: 0px;
}

ul.cloudList a {
  --size: 4;
  font-size: calc(var(--size) * 0.25rem + 0.5rem) !important;
  color: var(--main-text-color);
  display: block;
  font-size: 1.5rem;
  padding: 0.125rem 0.25rem;
  text-decoration: none;
  position: relative;
}

ul.cloudList a[state="add"] {
  color: green;
}

ul.cloudList a[state="del"] {
  color: red;
}

ul.cloudList a[data-weight="1"] { --size: 1; }
ul.cloudList a[data-weight="2"] { --size: 2; }
ul.cloudList a[data-weight="3"] { --size: 3; }
ul.cloudList a[data-weight="4"] { --size: 4; }
ul.cloudList a[data-weight="5"] { --size: 5; }
ul.cloudList a[data-weight="6"] { --size: 6; }
ul.cloudList a[data-weight="7"] { --size: 7; }
ul.cloudList a[data-weight="8"] { --size: 8; }
ul.cloudList a[data-weight="9"] { --size: 9; }

ul.cloudList[data-show-value] a::after {
  content: " (" attr(data-count) ")";
  font-size: 1rem;
}`

module.exports = new AttributeListWidget();

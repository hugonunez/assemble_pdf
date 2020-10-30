
//Override onload funtion or use fallback
const fallbackOnload = window.onload;
window.onload = onLoad || fallbackOnload;

//assemble pdf onload function
function onLoad () {
    const widgets = Getters.getWidgets();
    const parsedWidgets = Utils.parseWidgets(widgets)
    const pages = Utils.nodeListToIterable(Getters.getPages())
    const print = Getters.getPrint();
    const validated = Utils.validateRequiredParams(widgets, parsedWidgets, pages, print)
    if (validated) {
        console.log('Using assemble_pdf onLoad funtion')
        return assemblePDF({
            pages,
            items: parsedWidgets,
            print,
            skipPageTreshhold: constants.DEFAULT_SKIP_PAGE_TRESHHOLD,
            pageHeight: constants.PAGE_HEIGHT,
        })
    }
    console.log('Using fallback onLoad funtion')
    console.warn({MSG: "Could not load assemble_pdf, required elements returned: ", widgets, parsedWidgets, pages, print})
    return null
}
function assemblePDF({items, pages, pageHeight, skipPageTreshhold, print}) {
    let sumOfHeights = 0;
    //Iterate over widgets and assign them to a page
    for (let i = 0; i < items.length; i++) {
        const itemHeight = items[i].offsetHeight;
        //Grab last page since previous ones are filled
        let currentPage = pages[pages.length -1];
        //Delta is equal to the prev sum of heights + the current item height
        const delta = (sumOfHeights + itemHeight) - pageHeight;
        //Determine if a new page should be created and filled with the splitted widget.
        if (delta > skipPageTreshhold) {
            sumOfHeights = 0;
            //Update currentPage state with new one
            currentPage = Commands.createNewPage({print, pages});
            console.log({pageHeight, itemHeight, CO: constants.PAGE_HEIGHT})
            if ((itemHeight >= pageHeight) && items[i].table && !items[i].isHorizontalRow) { //Replace hasTable
                sumOfHeights = Commands.splitWidgetIntoPage({page: currentPage, pWidget: items[i].widget, pages, print});
                continue;
            }
        }
        sumOfHeights += itemHeight;
        currentPage.appendChild(items[i].widget);
    }
    Commands.hideElements();
    Commands.markAsReady();
}
const constants = {
    ALL_WIDGETS_SELECTOR: "#main > div.mail__container > div",
    ALL_PAGES_SELECTOR: '#print > div.pdf-page > div',
    TABLE_WIDGET_SELECTOR: "table.widget-product",
    ALL_MAIL_CONTAINERS: "#main > div.mail__container",
    /*1056*/
    PAGE_HEIGHT: (window.customSize)? window.customSize : 1056,
    PRINT_SELECTOR: 'print',
    DEFAULT_SKIP_PAGE_TRESHHOLD: 100
}
const Factories = {
     makeWidget (rawWidget){
        const type = Utils.getWidgetType(rawWidget.classList);
        const rows = Getters.getRows(rawWidget)
        return {
            widget: rawWidget,
            type,
            offsetHeight: rawWidget.offsetHeight,
            table: Getters.getTableFromWidget(rawWidget),
            tbody: Getters.getTbody(rawWidget),
            rows: rows.map(item => (this.makeRow(item))),
        }
    },
     makeRow(item){
        const rawCells = Getters.getCells(item);
        const cells = rawCells.map(el => (this.makeCell(el)))
        const isHorizontalRow = !!cells.find(el => el.cell.classList.contains('mail__hr'))
        return {row: item, cells, isHorizontalRow/*, height: getHeight(item)*/}
    },
     makeCell(item) {
        const img = item.querySelector('img');
        const map = item.querySelector('map');
        const rawLinks = Utils.nodeListToIterable(item.querySelectorAll('a'))
        return {cell: item, img: this.makeImage(img), map, links: rawLinks.map(item => (this.makeLink(item)))}
    },
     makeImage(item) {
        if (!item) {
            return null
        }
        return {
            img: item,
            src: item.src,
            width: item.width,
            height: item.height
        }
    },
     makeLink(item) {
        const style = getComputedStyle(item);
        return {
            link: item,
            href: item.href,
            style: {
                position: style.getPropertyValue('position'),
                top: style.getPropertyValue('top'),
                left: style.getPropertyValue('left'),
                width: style.getPropertyValue('width'),
                height: style.getPropertyValue('height')
            }
        }
    },
}
const Getters = {
    getRows(widget) {
        return Utils.nodeListToIterable(widget.querySelectorAll('tr'));
    },
    getCells(item) {
        return Utils.nodeListToIterable(item.querySelectorAll('td'));
    },
    getTbody(widget) {
        return widget.querySelector('tbody')
    },
    getPrint() {
        return document.getElementById(constants.PRINT_SELECTOR)
    },
    getWidgets() {
        return document.querySelectorAll(constants.ALL_WIDGETS_SELECTOR);
    },
    getPages() {
        return document.querySelectorAll(constants.ALL_PAGES_SELECTOR);
    },
    getTableFromWidget(widget){
    return widget.querySelector(constants.TABLE_WIDGET_SELECTOR)
    }
}
const Commands = {
    selfRemoveFromDOM(item) {
        item.parentNode.removeChild(item)
    },
    hideElements() {
        document.querySelector(constants.ALL_MAIL_CONTAINERS).style.display = "none";
    },
    markAsReady() {
        console.log('---------------------- COMPLETE------------------------');
        if (window.pdfdone) {
            window.pdfdone();
        }
        const page = false;
        if (page || true) {
            const readyElem = document.createElement("div");
            readyElem.setAttribute('id', 'pdf-ready');
            /*        page.appendChild(readyElem);*/
        }
        window.status = 'ready';
    },
    createNewPage({print = Getters.getPrint(), pages}) {
        const page = document.createElement("div");
        const pageWrapper = document.createElement("div")
        pageWrapper.setAttribute('class', 'pdf-page');
        pageWrapper.appendChild(page);
        print.appendChild(pageWrapper);
        pages.push(page);
        return page;
    },
    splitWidgetIntoPage({page, pWidget, pages, print}) {
        const itemClone = pWidget.cloneNode(true);
        let sumOfHeights = 0;
        let count = 0;
        const rows = Getters.getRows(pWidget)
        if (rows.length) {
            // Remove rows from widget, copy over from clone individually to fit to page
            for (let i = 0; i < rows.length; i++) {
                Commands.selfRemoveFromDOM(rows[i])
            }
            let nextRow = itemClone.querySelector('tr');
            const rowHeight = Utils.getHeight(nextRow);
            while (nextRow && count < 2 && sumOfHeights + rowHeight < pageHeight) {
                pWidget.querySelector('tbody').appendChild(nextRow);
                sumOfHeights += rowHeight;
                nextRow = itemClone.querySelector('tr');
                count++;
            }
            page.appendChild(pWidget);
            // Recurse on any remaining rows
            const cloneRows = Getters.getRows(itemClone)
            if (cloneRows.length) { return this.splitWidgetIntoPage(this.createNewPage({print, pages}), itemClone); }
        }
        console.count("SPLIT")

        return sumOfHeights;
    }
}
const Utils = {
    parseWidgets(widgets) {
        return [...widgets].map(w =>Factories.makeWidget(w))
    },
    omitProperties(properties = [], fun, ...args){
        const res = fun(args[0], args[1]);
        return {...res, ...(properties.map(p => ({[p]: undefined})))}
    },
    getHeight(element) {
        element.style.visibility = "hidden";
        document.body.appendChild(element);
        const height = element.offsetHeight + 0;
        document.body.removeChild(element);
        element.style.visibility = "visible";
        return height;
    },

    getWidgetType (classList){
        if(classList.length === 0){return 'unclassified'}
        if(classList.contains('mail__signature')){return 'mail__signature'}
        if(classList.contains('mail__intro-text')){return 'mail__intro-text'};
        return 'mail_widget'
    },
    nodeListToIterable(nodeList) {
        const items = [];
        nodeList.forEach(el => items.push(el))
        return items
    },
    validateRequiredParams(...params) {
        return params.every(i => !!i)
    }
}


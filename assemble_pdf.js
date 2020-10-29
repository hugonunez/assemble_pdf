const CONSTANTS = {
    ALL_WIDGETS_SELECTOR: "#main > div.mail__container > div",
    ALL_PAGES_SELECTOR: '#print > div.pdf-page > div',
    TABLE_WIDGET_SELECTOR: "table.widget-product",
    ALL_MAIL_CONTAINERS: "#main > div.mail__container",
    PAGE_HEIGHT: (window.customSize)? window.customSize : 1056,
    PRINT_SELECTOR: 'print',
    DEFAULT_SKIP_PAGE_TRESHHOLD: 100
}
//Override onload funtion or use fallback
const fallbackOnload = window.onload;
window.onload = onLoad || fallbackOnload;

//assemble pdf onload function
function onLoad () {
    const widgets = getWidgets();
    const parsedWidgets = parseWidgets(widgets, { omit: ['row', 'cell', 'widget', 'table', 'tbody'] })
    const pages = [...getPages()]
    const print = getPrint();
    const allOK = widgets.length && print && pages.length
    if (allOK) {
        console.log('Using assemble_pdf onLoad funtion')
        return decoupledAssemble({
            pages,
            parsedWidgets,
            print,
            skipPageTreshhold: CONSTANTS.DEFAULT_SKIP_PAGE_TRESHHOLD,
            pageHeight: CONSTANTS.PAGE_HEIGHT,
        })
    }
    console.log('Using fallback onLoad funtion')
    console.warn({MSG: "Could not load assemble_pdf, required elements returned: ", widgets, })
    return null
}
function decoupledAssemble({parsedWidgets, pages = [...getPages()], pageHeight, skipPageTreshhold, print}) {
    let sumOfHeights = 0;
    //Iterate over items and assign them to a page
    for (let i = 0; i < parsedWidgets.length; i++) {
        const itemHeight = parsedWidgets[i].offsetHeight;
        //Grab last page since previous ones are filled
        let currentPage = pages[pages.length -1];
        const delta = (sumOfHeights + itemHeight) - pageHeight;
        //Determine if a new page should be created and filled with the splitted widget.
        if (delta > skipPageTreshhold) {
            sumOfHeights = 0;
            //Update currentPage state with new one
            currentPage = createNewPage({print});
            pages.push(currentPage);
            if (itemHeight >= pageHeight && parsedWidgets[i].table) { //Replace hasTable
                total = splitWidgetIntoPage(page, parsedWidgets[i].widget);
            }
        }
        sumOfHeights += itemHeight;
        const a = parsedWidgets[i].widget;
        console.log({adasdsad:  a})
        currentPage.appendChild(parsedWidgets[i].widget);
    }
    hideElements();
    markAsReady();
}
function assembleHTML({widgets}) {
    //Given the arrays of widgets and pages, assemble the objects on an HTML
    //[{h: widgets[i].offsetHeight}]
    let sumOfHeights = 0
    for (let i = 0; i < widgets.length; i++) {
        const pages = getPages();
        let page = pages[pages.length - 1];
        const itemHeight = widgets[i].offsetHeight;
        const delta = (sumOfHeights + itemHeight) - CONSTANTS.PAGE_HEIGHT;
        // Create and add to a new page
        if (delta > 100) {
            page = createNewPage({print, pages});
            sumOfHeights = 0;
            const table = getTableFromWidget(widgets[i])
            console.log({table, itemHeight, pageHeight, codition: itemHeight > pageHeight && table})
            if (itemHeight >= pageHeight && table) {
                sumOfHeights = splitWidgetIntoPage(page, widgets[i]);
                continue;
            }
        }
        sumOfHeights += itemHeight;
        page.appendChild(widgets[i]);
    }
    hideElements();
    markAsReady();
}
function getWidgets() {
    return document.querySelectorAll(CONSTANTS.ALL_WIDGETS_SELECTOR);
}
function getPages() {
    return document.querySelectorAll(CONSTANTS.ALL_PAGES_SELECTOR);
}
function getTableFromWidget(widget){
    return widget.querySelector(CONSTANTS.TABLE_WIDGET_SELECTOR)
}
function parseWidgets(widgets) {
    return [...widgets].map(w =>makeWidget(w))
}
function hideElements() {
    document.querySelector(CONSTANTS.ALL_MAIL_CONTAINERS).style.display = "none";
}
function omitProperty(properties = [], fun, ...args){
    const res = fun(args[0], args[1]);
    return {...res, ...(properties.map(p => ({[p]: undefined})))}
}
function markAsReady() {
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
}
function splitWidgetIntoPage(page, pWidget) {
    var itemClone = pWidget.cloneNode(true);
    var sumOfHeights = 0;
    var count = 0;
    if (pWidget.rows.length) {
        // Remove rows from widget, copy over from clone individually to fit to page
        for (var i = 0; i < pWidget.rows.length; i++) {
            pWidget.rows[i].row.parentNode.removeChild(pWidget.rows[i].row);
        }
        let nextRow = itemClone.querySelector('tr');
        const rowHeight = getHeight(nextRow);
        while (nextRow && count < 2 && sumOfHeights + rowHeight < pageHeight) {
            pWidget.querySelector('tbody').appendChild(nextRow);
            sumOfHeights += rowHeight;
            nextRow = itemClone.querySelector('tr');
            count++;
        }
        page.appendChild(pWidget);
        console.log("Product widget split and added to page");
        // Recurse on any remaining rows
        const rows = getRows(itemClone)
        console.log({rows})
        if (rows) { return splitWidgetIntoPage(createNewPage(), itemClone); }
    }

    return sumOfHeights;
}
function getRows(widget) {
    return widget.querySelectorAll('tr')
}
function getTbody(widget) {
    return widget.querySelector('tbody')
}
function getPrint() {
    return document.getElementById(CONSTANTS.PRINT_SELECTOR)
}
function getHeight(element) {
    element.style.visibility = "hidden";
    document.body.appendChild(element);
    const height = element.offsetHeight + 0;
    document.body.removeChild(element);
    element.style.visibility = "visible";
    return height;
}
function createNewPage({print}) {
    const page = document.createElement("div");
    const pageWrapper = document.createElement("div")
    pageWrapper.setAttribute('class', 'pdf-page');
    pageWrapper.appendChild(page);
    print.appendChild(pageWrapper);
    return page;
}
function makeWidget (rawWidget){
    const type = getWidgetType(rawWidget.classList);
    return {
        type,
        offsetHeight: rawWidget.offsetHeight,
        table: getTableFromWidget(rawWidget),
        tbody: getTbody(rawWidget),
        widget: rawWidget,
        rows: [...getRows(rawWidget)].map(item => (makeRow(item))),
    }
}
function makeRow(item){
    const rawCells = item.querySelectorAll('td');
    const cells = [...rawCells].map(el => (makeCell(el)))
    const isHorizontalRow = !!cells.find(el => el.cell.classList.contains('mail__hr'))
    return {row: item, cells, isHorizontalRow, height: getHeight(item)}
}
function makeCell(item) {
    const img = item.querySelector('img');
    const map = item.querySelector('map');
    const rawLinks = [...(item.querySelectorAll('a'))];
    return {cell: item, img: makeImage(img), map, links: rawLinks.map(item => (makeLink(item)))}
}
function makeImage(item) {
    if (!item) {
        return null
    }
    return {
        img: item,
        src: item.src,
        width: item.width,
        height: item.height
    }
}
function makeLink(item) {
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
}
function getWidgetType (classList){
    if(classList.length === 0){return 'unclassified'}
    if(classList.contains('mail__signature')){return 'mail__signature'}
    if(classList.contains('mail__intro-text')){return 'mail__intro-text'};
    return 'mail_widget'
}
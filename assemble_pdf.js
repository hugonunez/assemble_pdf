const CONSTANTS = {
    ALL_WIDGETS_SELECTOR: "#main > div.mail__container > div",
    ALL_PAGES_SELECTOR: '#print > div.pdf-page > div',
    TABLE_WIDGET_SELECTOR: "table.widget-product",
    ALL_MAIL_CONTAINERS: "#main > div.mail__container",
    PAGE_HEIGHT: (window.customSize)? window.customSize : 1056,
    PRINT_SELECTOR: 'print'
}
//Override onload funtion or use fallback
const fallbackOnload = window.onload;
window.onload = onLoad || fallbackOnload;

//assemble pdf onload function
function onLoad () {
    const widgets = getWidgets();
    const allOK = widgets.length > 0
    if (allOK) {
        console.log('Using assemble_pdf onLoad funtion')
        return decoupledAssemble({widgets})
    }
    console.log('Using fallback onLoad funtion')
    console.warn({MSG: "Could not load assemble_pdf, required elements returned: ", widgets, })
    return null
}

function decoupledAssemble({widgets, pages = [...getPages()], pageHeight = CONSTANTS.PAGE_HEIGHT, skipPageTreshhold = 100, print = getPrint()}) {
    let sumOfHeights = 0;
    //Iterate over items and assign them to a page
    for (let i = 0; i < widgets.length; i++) {
        const itemHeight = widgets[i].offsetHeight;
        //Grab last page since previous ones are filled
        let currentPage = pages[pages.length -1];
        const delta = (sumOfHeights + itemHeight) - pageHeight;
        //Determine if a new page should be created and filled with the splitted widget.
        if (delta > skipPageTreshhold) {
            sumOfHeights = 0;
            currentPage = createPage({print});
        }
        sumOfHeights += itemHeight;
        currentPage.appendChild(widgets[i]);
        pages.push(currentPage)
    }
    hideElements();
    markAsReady();
}


//Given the arrays of widgets and pages, assemble the objects on an HTML
//[{h: widgets[i].offsetHeight}]
function assembleHTML({widgets}) {
    let sumOfHeights = 0
    for (let i = 0; i < widgets.length; i++) {
        const pages = getPages();
        let page = pages[pages.length - 1];
        var itemHeight = widgets[i].offsetHeight;
        var delta = (sumOfHeights + itemHeight) - CONSTANTS.PAGE_HEIGHT;
        // Create and add to a new page
        if (delta > 100) {
            page = createPage({print, pages});
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
    return widgets
}
function hideElements() {
    document.querySelector(CONSTANTS.ALL_MAIL_CONTAINERS).style.display = "none";
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
    var rows = getRows(pWidget);
    if (rows.length) {
        // Remove rows from widget, copy over from clone individually to fit to page
        for (var i = 0; i < rows.length; i++) {
            rows[i].parentNode.removeChild(rows[i]);
        }
        let nextRow = itemClone.querySelector('tr');
        const rowHeight = getHeight(nextRow);
        while (nextRow && count < 2 && sumOfHeights + rowHeight < pageHeight) {
            getTbody(pWidget).appendChild(nextRow);
            sumOfHeights += rowHeight;
            nextRow = itemClone.querySelector('tr');
            count++;
        }
        page.appendChild(pWidget);
        console.log("Product widget split and added to page");
        // Recurse on any remaining rows
        const rows = getRows(itemClone)
        console.log({rows})
        if (rows) { return splitWidgetIntoPage(createPage(), itemClone); }
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
function createPage({print, pages = []}) {
    const page = document.createElement("div");
    const pageWrapper = document.createElement("div")
    pageWrapper.setAttribute('class', 'pdf-page');
    pageWrapper.appendChild(page);
    print.appendChild(pageWrapper);
    pages.push(page);
    return page;
}

function getHeight(element) {
    element.style.visibility = "hidden";
    document.body.appendChild(element);
    const height = element.offsetHeight + 0;
    document.body.removeChild(element);
    element.style.visibility = "visible";
    return height;
}
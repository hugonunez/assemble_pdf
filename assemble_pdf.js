//Override onload funtion
const CONSTANTS = {
    ALL_WIDGETS_SELECTOR: "#main > div.mail__container > div",
    ALL_PAGES_SELECTOR: '#print > div.pdf-page > div',
    TABLE_WIDGET_SELECTOR: "table.widget-product",
    ALL_MAIL_CONTAINERS: "#main > div.mail__container",
}
const fallbackOnload = window.onload;
window.onload = onLoad || fallbackOnload;

function onLoad () {
    const widgets = getWidgets();
    const pages = getPages()
    const jsonWidgets = parseWidgets(widgets);
    const allOK = widgets.length > 0;
    if (allOK) {
        console.log('Using assemble_pdf onLoad funtion')
        return assemblePdf({widgets})
    }
    console.log('Using fallback onLoad funtion')
    return null

}

function assemblePdf({widgets}) {
    console.log({widgets})
    //fallbackOnload();
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

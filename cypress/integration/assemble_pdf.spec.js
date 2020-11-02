describe("Assemble PDF", () => {

    it("Checks the structure of HTML page", ()=> {
        cy.visit("/")
        cy.contains("div")
    })

})
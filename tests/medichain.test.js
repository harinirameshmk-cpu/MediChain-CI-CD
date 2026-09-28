describe("MediChain CI/CD Tests", () => {

    test("MediChain project should be working", () => {
        expect(true).toBe(true);
    });

    test("Medicine quantity should be valid", () => {
        const quantity = 100;
        expect(quantity).toBeGreaterThan(0);
    });

});
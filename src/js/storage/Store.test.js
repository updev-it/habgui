import { Store } from "./Store";

// Store.test.js

let store;

beforeEach(() => {
    
});

beforeAll(() => {
    // store = new Store("TestStore");
});

describe("Test Store class", () => {

    let store;

    beforeEach(() => {
        store = new Store("TestStore");
    });

    it('Store constructor was called', async () => {
        expect.assertions(3);

        expect(store.activeQueries).toStrictEqual({});
        expect(store.lastRefresh).toStrictEqual({});
        expect(store.storeName).toBe("TestStore");        
      });

      it("Store constructor rejects when 'indexedDB' is not defined", async () => {
        expect.assertions(1);

        await expect(store.connect()).rejects.toThrow('indexedDB is not defined');
      });  

});
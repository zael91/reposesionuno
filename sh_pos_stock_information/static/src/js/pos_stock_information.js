odoo.define('sh_pos_stock_information.pos_stock_information', function (require) {
    'use strict';

    const { PosGlobalState, Order, Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    var PosDB = require('point_of_sale.DB');
    const PaymentScreen = require("point_of_sale.PaymentScreen");

    const shPosOrderline = (Orderline) => class shPosOrderline extends Orderline {
        set_quantity(quantity, keep_price) {
            
            var result =  super.set_quantity(...arguments);
            var quant = parseFloat(quantity) || 0;
            var on_hand;
            var virtual_qty;
            if (this.pos.config.sh_enable_on_hand_qty) {
                if (this.pos.config.sh_manage_stock == "on_hand_qty") {
                    if (this.product.type == 'product') {
                        on_hand = this.pos.product_qty_data_dict[this.product.id][0] - quant
                    }
                }
                else if (this.pos.config.sh_manage_stock == "available_qty") {
                    if (this.product.type == 'product') {
                        virtual_qty = this.pos.product_qty_data_dict[this.product.id][1] - quant
                    }
                }
                else {
                    if (this.product.type == 'product') {
                        on_hand = this.pos.product_qty_data_dict[this.product.id][0] - quant
                        virtual_qty = this.pos.product_qty_data_dict[this.product.id][1] - quant
                    }

                }
                if (document.getElementById(this.product.id)) {
                    document.getElementById(this.product.id).innerHTML = on_hand
                    if(on_hand > 0){
                        $(document.getElementById(this.product.id)).parent('span').addClass('sh_display_positive_qty')
                        $(document.getElementById(this.product.id)).parent('span').removeClass('sh_display_nagative_qty')
                    }
                    else{
                        $(document.getElementById(this.product.id)).parent('span').addClass('sh_display_nagative_qty')
                        $(document.getElementById(this.product.id)).parent('span').removeClass('sh_display_positive_qty')
                    }
                }
                if (document.getElementsByName(this.product.id).length > 0) {
                    document.getElementsByName(this.product.id)[0].innerHTML = virtual_qty

                    if(virtual_qty > 0){
                        $(document.getElementsByName(this.product.id)[0]).parent('span').addClass('sh_display_positive_virtual_qty')
                        $(document.getElementsByName(this.product.id)[0]).parent('span').removeClass('sh_display_nagative_virtual_qty')
                    }
                    else{
                        $(document.getElementsByName(this.product.id)[0]).parent('span').addClass('sh_display_nagative_virtual_qty')
                        $(document.getElementsByName(this.product.id)[0]).parent('span').removeClass('sh_display_positive_virtual_qty')
                    }
                }
            }
            return result
        }
    }
    Registries.Model.extend(Orderline, shPosOrderline);

    const shPosGlobalState = (PosGlobalState) => class shPosGlobalState extends PosGlobalState {

        async _processData(loadedData) {
            await super._processData(...arguments);
            this.product_qty_data_dict = loadedData['product_qty_data_dict'] || [];
        }
        
    }

    Registries.Model.extend(PosGlobalState, shPosGlobalState);

    const ShPaymentScreen = (PaymentScreen) =>
        class ShPaymentScreen extends PaymentScreen {
            async validateOrder(isForceValidate) {
                var self = this
                if (self.env.pos.config.sh_enable_on_hand_qty) {
                    var all_on_hand_qty = self.env.pos.product_qty_data_dict
                    var orderlines = self.env.pos.get_order().get_orderlines()
                    
                    _.each(all_on_hand_qty, function (value, product_id) {
                        _.each(orderlines, function (line) {
                            if (line) {
                                if (product_id == line.product.id) {
                                    if (line.product.type == 'product') {
                                        value[0] = value[0] - line.quantity
                                        value[1] = value[1] - line.quantity
                                    }
                                }
                            }
                        })
                    })
                }
                super.validateOrder(isForceValidate)
            }
        }
    Registries.Component.extend(PaymentScreen, ShPaymentScreen)

});